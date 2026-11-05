import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { hashToken } from '@/core/auth/opaque-token';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { refreshTokens } from '@/core/database/schema';
import { MailService } from '@/core/mail/mail.service';
import { REFRESH_REUSE_GRACE_MS } from '@/modules/auth/auth.service';
import { createTestApp, resetDatabase } from './utils/create-test-app';

/** Pega o valor de um cookie do Set-Cookie. */
function cookie(res: request.Response, name: string): string | undefined {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  return header
    ?.find((c) => c.startsWith(`${name}=`))
    ?.split(';')[0]
    ?.split('=')[1];
}

describe('Autenticação (e2e)', () => {
  let app: INestApplication;
  const ana = { name: 'Ana', email: 'ana@teste.com', password: 'senha-forte-1' };

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());

  it('cadastro → 201, devolve o usuário e define cookies httpOnly', async () => {
    const res = await http().post('/api/auth/register').send(ana).expect(201);
    expect(res.body.user).toMatchObject({ name: 'Ana', email: 'ana@teste.com' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(setCookie).toMatch(/access_token=.*HttpOnly/);
    expect(setCookie).toMatch(/refresh_token=.*Path=\/api\/auth/);
  });

  it('cadastro com e-mail repetido (maiúsculas diferentes) → 409 EMAIL_TAKEN', async () => {
    await http().post('/api/auth/register').send(ana).expect(201);
    const res = await http()
      .post('/api/auth/register')
      .send({ ...ana, email: 'ANA@teste.com' })
      .expect(409);
    expect(res.body.error).toBe('EMAIL_TAKEN');
  });

  it('cadastro com dados inválidos → 422 com os campos', async () => {
    const res = await http().post('/api/auth/register').send({ name: '', email: 'x', password: '1' }).expect(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('rota protegida: 401 sem login, 200 com o cookie do login', async () => {
    await http().get('/api/users/me').expect(401);
    await http().post('/api/auth/register').send(ana);
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: ana.email, password: ana.password }).expect(200);
    const me = await agent.get('/api/users/me').expect(200);
    expect(me.body.email).toBe(ana.email);
  });

  it('login com senha errada → 401 com mensagem genérica', async () => {
    await http().post('/api/auth/register').send(ana);
    const res = await http().post('/api/auth/login').send({ email: ana.email, password: 'errada' }).expect(401);
    expect(res.body.message).toBe('E-mail ou senha inválidos');
  });

  it('refresh rotaciona o token; reusar o antigo encerra todas as sessões', async () => {
    const reg = await http().post('/api/auth/register').send(ana);
    const first = cookie(reg, 'refresh_token');

    const r1 = await http().post('/api/auth/refresh').set('Cookie', `refresh_token=${first}`).expect(200);
    const second = cookie(r1, 'refresh_token');
    expect(second).toBeDefined();
    expect(second).not.toBe(first);

    // Passado o intervalo de tolerância, reusar o token é tratado como roubo.
    await app
      .get<Database>(DRIZZLE)
      .update(refreshTokens)
      .set({ revokedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 1000) })
      .where(eq(refreshTokens.tokenHash, hashToken(first!)));

    await http().post('/api/auth/refresh').set('Cookie', `refresh_token=${first}`).expect(401); // reuso
    await http().post('/api/auth/refresh').set('Cookie', `refresh_token=${second}`).expect(401); // derrubada junto
  });

  it('refresh simultâneo: uma sessão nova, o outro recebe 409 sem apagar cookies e a sessão sobrevive', async () => {
    // Repete porque a ordem das requisições varia, e cada ordem passa por um caminho diferente.
    for (let i = 0; i < 5; i++) {
      const reg = await http()
        .post('/api/auth/register')
        .send({ ...ana, email: `aba${i}@teste.com` });
      const token = cookie(reg, 'refresh_token');
      const send = () => http().post('/api/auth/refresh').set('Cookie', `refresh_token=${token}`);

      const results = await Promise.all([send(), send()]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const winner = results.find((r) => r.status === 200)!;
      const loser = results.find((r) => r.status === 409)!;
      expect(loser.body.error).toBe('REFRESH_IN_PROGRESS');
      expect(loser.headers['set-cookie']).toBeUndefined();
      await http()
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${cookie(winner, 'refresh_token')}`)
        .expect(200);
    }
  });

  it('cadastro simultâneo com o mesmo e-mail: um 201 e os demais 409', async () => {
    const results = await Promise.all([1, 2, 3].map(() => http().post('/api/auth/register').send(ana)));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
  });

  it('caractere nulo em texto → 422', async () => {
    await http()
      .post('/api/auth/register')
      .send({ ...ana, name: 'A\u0000na' })
      .expect(422);
  });

  it('logout revoga a sessão', async () => {
    const reg = await http().post('/api/auth/register').send(ana);
    const rt = cookie(reg, 'refresh_token');
    await http().post('/api/auth/logout').set('Cookie', `refresh_token=${rt}`).expect(204);
    await http().post('/api/auth/refresh').set('Cookie', `refresh_token=${rt}`).expect(401);
  });

  it('recuperação de senha: link do e-mail troca a senha e só funciona uma vez', async () => {
    await http().post('/api/auth/register').send(ana);
    await http().post('/api/auth/forgot-password').send({ email: ana.email }).expect(204);
    await http().post('/api/auth/forgot-password').send({ email: 'ninguem@teste.com' }).expect(204);

    const mail = app.get(MailService);
    const token = /token=([A-Za-z0-9_-]+)/.exec(mail.outbox.at(-1)!.text)![1];

    await http().post('/api/auth/reset-password').send({ token, password: 'senha-nova-2' }).expect(204);
    await http().post('/api/auth/login').send({ email: ana.email, password: ana.password }).expect(401);
    await http().post('/api/auth/login').send({ email: ana.email, password: 'senha-nova-2' }).expect(200);

    const again = await http().post('/api/auth/reset-password').send({ token, password: 'outra-senha-3' }).expect(400);
    expect(again.body.error).toBe('INVALID_RESET_TOKEN');
  });

  it('redefinir a senha invalida também os links antigos do usuário', async () => {
    await http().post('/api/auth/register').send(ana);
    const mail = app.get(MailService);
    const requestToken = async () => {
      await http().post('/api/auth/forgot-password').send({ email: ana.email }).expect(204);
      return /token=([A-Za-z0-9_-]+)/.exec(mail.outbox.at(-1)!.text)![1];
    };
    const older = await requestToken();
    const newer = await requestToken();

    await http().post('/api/auth/reset-password').send({ token: newer, password: 'senha-nova-2' }).expect(204);
    const res = await http()
      .post('/api/auth/reset-password')
      .send({ token: older, password: 'senha-velha-3' })
      .expect(400);
    expect(res.body.error).toBe('INVALID_RESET_TOKEN');
    await http().post('/api/auth/login').send({ email: ana.email, password: 'senha-nova-2' }).expect(200);
  });

  it('PATCH /users/me altera o nome', async () => {
    await http().post('/api/auth/register').send(ana);
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: ana.email, password: ana.password });
    const res = await agent.patch('/api/users/me').send({ name: 'Ana Maria' }).expect(200);
    expect(res.body.name).toBe('Ana Maria');
  });
});
