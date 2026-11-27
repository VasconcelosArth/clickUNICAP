import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { commentMentions } from '@/core/database/schema';
import { DomainEvents } from '@/core/events';
import { registerUser, registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';
import { addMember } from './utils/members';

const RANDOM_UUID = '3f2a9c1e-1111-4111-8111-111111111111';

describe('Comentários (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  const mentionsOf = (commentId: string) =>
    app
      .get<Database>(DRIZZLE)
      .select()
      .from(commentMentions)
      .where(eq(commentMentions.commentId, commentId))
      .then((rows) => rows.map((r) => r.userId).sort());

  /** Os ouvintes rodam depois da resposta HTTP: consulta a caixa de entrada até ter `count` itens. */
  async function waitForNotifications(
    agent: ReturnType<typeof request.agent>,
    h: Record<string, string>,
    count: number,
  ): Promise<{ type: string; refId: string }[]> {
    const deadline = Date.now() + 2000;
    for (;;) {
      const res = await agent.get('/api/notifications').set(h).expect(200);
      const items = res.body.data as { type: string; refId: string }[];
      if (items.length >= count) return items;
      if (Date.now() > deadline) throw new Error(`A caixa de entrada não chegou a ${count} notificação(ões)`);
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  async function setup() {
    const owner = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': owner.workspace.id };
    const project = await createProject(owner.agent, owner.workspace.id);
    const task = await createTask(owner.agent, owner.workspace.id, project.id);
    return { ...owner, h, project, task, url: `/api/tasks/${task.id}/comments` };
  }

  it('401 sem login', async () => {
    await request(app.getHttpServer()).get(`/api/tasks/${RANDOM_UUID}/comments`).expect(401);
    await request(app.getHttpServer()).delete(`/api/comments/${RANDOM_UUID}`).expect(401);
  });

  it('cria, lista em ordem, edita e apaga o próprio comentário', async () => {
    const { agent, user, h, task, url } = await setup();

    const c1 = await agent.post(url).set(h).send({ body: 'Olá' }).expect(201);
    expect(c1.body).toMatchObject({ body: 'Olá', taskId: task.id, authorId: user.id });
    await agent.post(url).set(h).send({ body: 'Segundo' }).expect(201);

    const list = await agent.get(url).set(h).expect(200);
    expect((list.body as { body: string }[]).map((c) => c.body)).toEqual(['Olá', 'Segundo']);

    const edited = await agent.patch(`/api/comments/${c1.body.id}`).set(h).send({ body: 'Editado' }).expect(200);
    expect(edited.body.body).toBe('Editado');

    await agent.delete(`/api/comments/${c1.body.id}`).set(h).expect(204);
    const after = await agent.get(url).set(h).expect(200);
    expect(after.body).toHaveLength(1);
  });

  it('422 com corpo vazio ou caractere nulo', async () => {
    const { agent, h, url } = await setup();
    await agent.post(url).set(h).send({ body: '' }).expect(422);
    await agent.post(url).set(h).send({ body: 'a\u0000b' }).expect(422);
    const c = await agent.post(url).set(h).send({ body: 'ok' }).expect(201);
    await agent.patch(`/api/comments/${c.body.id}`).set(h).send({ body: '' }).expect(422);
  });

  it('ISOLAMENTO: outro workspace recebe 404 na tarefa e no comentário', async () => {
    const a = await setup();
    const b = await registerUserWithWorkspace(app, 'B');
    const hb = { 'X-Workspace-Id': b.workspace.id };
    const c = await a.agent.post(a.url).set(a.h).send({ body: 'Meu' }).expect(201);

    await b.agent.get(a.url).set(hb).expect(404);
    await b.agent.post(a.url).set(hb).send({ body: 'x' }).expect(404);
    await b.agent.patch(`/api/comments/${c.body.id}`).set(hb).send({ body: 'hack' }).expect(404);
    await b.agent.delete(`/api/comments/${c.body.id}`).set(hb).expect(404);

    const intact = await a.agent.get(a.url).set(a.h).expect(200);
    expect(intact.body).toHaveLength(1);
    expect(intact.body[0].body).toBe('Meu');
  });

  it('só o autor edita ou apaga (403), mesmo sendo membro ou admin', async () => {
    const { agent: dono, workspace, h, url } = await setup();
    const membro = await addMember(app, dono, workspace.id);
    const c = await membro.agent.post(url).set(h).send({ body: 'Do membro' }).expect(201);

    await dono.patch(`/api/comments/${c.body.id}`).set(h).send({ body: 'x' }).expect(403);
    await dono.delete(`/api/comments/${c.body.id}`).set(h).expect(403);

    const list = await dono.get(url).set(h).expect(200);
    expect(list.body[0].body).toBe('Do membro');
  });

  it('menção de membro grava em comment_mentions e emite o evento; quem não é membro é ignorado', async () => {
    const { agent, user, workspace, h, url, task } = await setup();
    const membro = await addMember(app, agent, workspace.id);
    const { user: forasteiro } = await registerUser(app);

    const received: unknown[] = [];
    const listener = (e: unknown) => received.push(e);
    const emitter = app.get(EventEmitter2);
    emitter.on(DomainEvents.CommentMentioned, listener);

    const body = `oi @[${membro.user.id}] e @[${forasteiro.id}]`;
    const c = await agent.post(url).set(h).send({ body }).expect(201);
    emitter.off(DomainEvents.CommentMentioned, listener);

    expect(await mentionsOf(c.body.id)).toEqual([membro.user.id]);
    expect(received).toEqual([
      {
        commentId: c.body.id,
        taskId: task.id,
        mentionedUserId: membro.user.id,
        by: user.id,
        workspaceId: workspace.id,
      },
    ]);
    // Espera o ouvinte assíncrono gravar a notificação: senão ele corre junto com o reset do próximo teste.
    await waitForNotifications(membro.agent, h, 1);
  });

  it('FLUXO: comentar com menção faz a notificação comment_mentioned chegar ao mencionado', async () => {
    const { agent, user, workspace, h, url, task, project } = await setup();
    const membro = await addMember(app, agent, workspace.id);

    const c = await agent
      .post(url)
      .set(h)
      .send({ body: `@[${membro.user.id}] pode revisar?` })
      .expect(201);

    // O ouvinte de notificações roda depois da resposta HTTP: consulta a caixa do membro até chegar (ou estourar o prazo).
    const notifications = await waitForNotifications(membro.agent, h, 1);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: 'comment_mentioned',
      refId: c.body.id,
      readAt: null,
      payload: {
        taskId: task.id,
        projectId: project.id,
        actorId: user.id,
        commentId: c.body.id,
      },
    });

    // O autor não é notificado pelo próprio comentário.
    const autor = await agent.get('/api/notifications').set(h).expect(200);
    expect(autor.body.data).toEqual([]);
  });

  it('editar troca as menções e só avisa as novas; apagar remove as menções', async () => {
    const { agent, workspace, h, url } = await setup();
    const m1 = await addMember(app, agent, workspace.id);
    const m2 = await addMember(app, agent, workspace.id);
    const c = await agent
      .post(url)
      .set(h)
      .send({ body: `@[${m1.user.id}]` })
      .expect(201);

    const received: { mentionedUserId: string }[] = [];
    const listener = (e: { mentionedUserId: string }) => received.push(e);
    const emitter = app.get(EventEmitter2);
    emitter.on(DomainEvents.CommentMentioned, listener);

    await agent
      .patch(`/api/comments/${c.body.id}`)
      .set(h)
      .send({ body: `@[${m1.user.id}] @[${m2.user.id}]` })
      .expect(200);
    emitter.off(DomainEvents.CommentMentioned, listener);

    expect(received.map((e) => e.mentionedUserId)).toEqual([m2.user.id]);
    expect(await mentionsOf(c.body.id)).toEqual([m1.user.id, m2.user.id].sort());

    await agent.patch(`/api/comments/${c.body.id}`).set(h).send({ body: 'sem menção' }).expect(200);
    expect(await mentionsOf(c.body.id)).toEqual([]);

    await agent.delete(`/api/comments/${c.body.id}`).set(h).expect(204);
    // Espera os ouvintes assíncronos (uma menção para cada) antes do reset do próximo teste.
    await waitForNotifications(m1.agent, h, 1);
    await waitForNotifications(m2.agent, h, 1);
  });

  it('projeto arquivado é somente leitura (409), mas a lista continua visível', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);
    const url = `/api/tasks/${t.id}/comments`;
    const c = await agent.post(url).set(h).send({ body: 'Antes' }).expect(201);

    const membro = await addMember(app, agent, workspace.id);
    await agent.post(`/api/projects/${p.id}/archive`).set(h).expect(200);

    // Arquivado é checado antes da autoria: quem não é autor também recebe 409.
    await membro.agent.patch(`/api/comments/${c.body.id}`).set(h).send({ body: 'x' }).expect(409);
    await membro.agent.delete(`/api/comments/${c.body.id}`).set(h).expect(409);

    const refused = await agent.post(url).set(h).send({ body: 'Depois' }).expect(409);
    expect(refused.body.error).toBe('PROJECT_ARCHIVED');
    await agent.patch(`/api/comments/${c.body.id}`).set(h).send({ body: 'x' }).expect(409);
    await agent.delete(`/api/comments/${c.body.id}`).set(h).expect(409);
    await agent.get(url).set(h).expect(200);

    await agent.post(`/api/projects/${p.id}/unarchive`).set(h).expect(200);
    await agent.patch(`/api/comments/${c.body.id}`).set(h).send({ body: 'ok' }).expect(200);
  });
});
