import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { currentTimerSchema, taskTimeEntriesSchema, timeEntrySchema } from '@clickunicap/shared';
import { MailService } from '@/core/mail/mail.service';
import { registerUser, registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

describe('Controle de tempo (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  /** Ana (dona e admin) com projeto e duas tarefas, e Bia (membro) que entrou por convite. */
  async function setup() {
    const ana = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': ana.workspace.id };
    await ana.agent.post(`/api/workspaces/${ana.workspace.id}/invites`).send({ email: 'bia@teste.com' }).expect(201);
    const token = /token=([A-Za-z0-9_-]+)/.exec(app.get(MailService).outbox.at(-1)!.text)![1];
    const bia = await registerUser(app, { name: 'Bia', email: 'bia@teste.com' });
    await bia.agent.post('/api/invites/accept').send({ token }).expect(200);
    const project = await createProject(ana.agent, ana.workspace.id);
    const a = await createTask(ana.agent, ana.workspace.id, project.id, { title: 'Montar a vitrine' });
    const b = await createTask(ana.agent, ana.workspace.id, project.id, { title: 'Catalogar acervo' });
    return { ana, bia, h, project, a, b };
  }

  it('401 sem login', async () => {
    const id = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
    const http = request(app.getHttpServer());
    await http.get(`/api/tasks/${id}/time-entries`).expect(401);
    await http.post(`/api/tasks/${id}/time-entries/start`).expect(401);
    await http.get('/api/time-entries/current').expect(401);
    await http.post('/api/time-entries/current/stop').expect(401);
  });

  it('inicia, mostra o timer ativo, para e lista com o total', async () => {
    const { ana, h, a } = await setup();

    const started = await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);
    expect(() => timeEntrySchema.parse(started.body)).not.toThrow();
    expect(started.body).toMatchObject({ taskId: a.id, userId: ana.user.id, endedAt: null, minutes: null });

    const current = await ana.agent.get('/api/time-entries/current').set(h).expect(200);
    expect(() => currentTimerSchema.parse(current.body)).not.toThrow();
    expect(current.body.timer).toMatchObject({ id: started.body.id, taskTitle: 'Montar a vitrine' });

    const stopped = await ana.agent.post('/api/time-entries/current/stop').set(h).expect(200);
    expect(stopped.body).toMatchObject({ id: started.body.id, minutes: 0 });
    expect(typeof stopped.body.endedAt).toBe('string');

    expect((await ana.agent.get('/api/time-entries/current').set(h).expect(200)).body).toEqual({ timer: null });
    await ana.agent.post('/api/time-entries/current/stop').set(h).expect(404);

    await ana.agent.post(`/api/tasks/${a.id}/time-entries`).set(h).send({ minutes: 45, note: 'Reunião' }).expect(201);
    const list = await ana.agent.get(`/api/tasks/${a.id}/time-entries`).set(h).expect(200);
    expect(() => taskTimeEntriesSchema.parse(list.body)).not.toThrow();
    expect(list.body.totalMinutes).toBe(45);
    expect(list.body.entries).toHaveLength(2);
    // Mais recentes primeiro pelo início: o manual "terminou agora", então começou 45 min antes do timer
    expect(list.body.entries[0]).toMatchObject({ id: started.body.id, minutes: 0 });
    expect(list.body.entries[1]).toMatchObject({ minutes: 45, note: 'Reunião', userName: ana.user.name });
  });

  it('só 1 timer ativo por usuário (409), inclusive com dois cliques ao mesmo tempo', async () => {
    const { ana, h, a, b } = await setup();

    const [r1, r2] = await Promise.all([
      ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h),
      ana.agent.post(`/api/tasks/${b.id}/time-entries/start`).set(h),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect([r1, r2].find((r) => r.status === 409)!.body.error).toBe('TIMER_ALREADY_RUNNING');
  });

  it('cada pessoa tem o próprio timer', async () => {
    const { ana, bia, h, a } = await setup();
    await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);
    await bia.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);

    await bia.agent.post('/api/time-entries/current/stop').set(h).expect(200);
    const anas = await ana.agent.get('/api/time-entries/current').set(h).expect(200);
    expect(anas.body.timer).not.toBeNull();
  });

  it('valida o lançamento manual (422 e 400)', async () => {
    const { ana, h, a } = await setup();
    const post = (body: object) => ana.agent.post(`/api/tasks/${a.id}/time-entries`).set(h).send(body);

    await post({ minutes: 0 }).expect(422);
    await post({}).expect(422);
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    expect((await post({ minutes: 10, startedAt: future }).expect(400)).body.error).toBe('TIME_ENTRY_IN_FUTURE');
  });

  it('o autor e o admin editam e excluem; outro membro recebe 403', async () => {
    const { ana, bia, h, a } = await setup();
    const own = await bia.agent.post(`/api/tasks/${a.id}/time-entries`).set(h).send({ minutes: 20 }).expect(201);
    const anas = await ana.agent.post(`/api/tasks/${a.id}/time-entries`).set(h).send({ minutes: 30 }).expect(201);

    const edited = await bia.agent.patch(`/api/time-entries/${own.body.id}`).set(h).send({ minutes: 25 }).expect(200);
    expect(edited.body.minutes).toBe(25);
    await bia.agent.patch(`/api/time-entries/${anas.body.id}`).set(h).send({ note: 'x' }).expect(403);
    await bia.agent.delete(`/api/time-entries/${anas.body.id}`).set(h).expect(403);

    // Ana é admin: mexe na entrada da Bia
    await ana.agent.patch(`/api/time-entries/${own.body.id}`).set(h).send({ note: 'revisado' }).expect(200);
    await ana.agent.delete(`/api/time-entries/${own.body.id}`).set(h).expect(204);
    await bia.agent.delete(`/api/time-entries/${own.body.id}`).set(h).expect(404);

    const list = await ana.agent.get(`/api/tasks/${a.id}/time-entries`).set(h).expect(200);
    expect(list.body.totalMinutes).toBe(30);
  });

  it('não muda os minutos de um timer ativo (409)', async () => {
    const { ana, h, a } = await setup();
    const started = await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);

    const res = await ana.agent.patch(`/api/time-entries/${started.body.id}`).set(h).send({ minutes: 5 }).expect(409);
    expect(res.body.error).toBe('TIMER_RUNNING');
  });

  it('projeto arquivado é somente leitura, mas o timer ativo ainda para', async () => {
    const { ana, h, project, a } = await setup();
    const manual = await ana.agent.post(`/api/tasks/${a.id}/time-entries`).set(h).send({ minutes: 10 }).expect(201);
    await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);
    await ana.agent.post(`/api/projects/${project.id}/archive`).set(h).expect(200);

    await ana.agent.post('/api/time-entries/current/stop').set(h).expect(200);
    expect((await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(409)).body.error).toBe(
      'PROJECT_ARCHIVED',
    );
    await ana.agent.post(`/api/tasks/${a.id}/time-entries`).set(h).send({ minutes: 5 }).expect(409);
    await ana.agent.patch(`/api/time-entries/${manual.body.id}`).set(h).send({ note: 'x' }).expect(409);
    await ana.agent.delete(`/api/time-entries/${manual.body.id}`).set(h).expect(409);
    await ana.agent.get(`/api/tasks/${a.id}/time-entries`).set(h).expect(200);
  });

  it('excluir a tarefa apaga o tempo dela, inclusive o timer ativo', async () => {
    const { ana, h, a } = await setup();
    await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);

    await ana.agent.delete(`/api/tasks/${a.id}`).set(h).expect(204);
    expect((await ana.agent.get('/api/time-entries/current').set(h).expect(200)).body).toEqual({ timer: null });
  });

  describe('isolamento entre workspaces', () => {
    it('não lê nem mexe no tempo de outro workspace (404)', async () => {
      const owner = await setup();
      const entry = await owner.ana.agent
        .post(`/api/tasks/${owner.a.id}/time-entries`)
        .set(owner.h)
        .send({ minutes: 15 })
        .expect(201);
      const intruder = await registerUserWithWorkspace(app, 'Outro');
      const ih = { 'X-Workspace-Id': intruder.workspace.id };

      await intruder.agent.get(`/api/tasks/${owner.a.id}/time-entries`).set(ih).expect(404);
      await intruder.agent.post(`/api/tasks/${owner.a.id}/time-entries/start`).set(ih).expect(404);
      await intruder.agent.post(`/api/tasks/${owner.a.id}/time-entries`).set(ih).send({ minutes: 5 }).expect(404);
      await intruder.agent.patch(`/api/time-entries/${entry.body.id}`).set(ih).send({ note: 'x' }).expect(404);
      await intruder.agent.delete(`/api/time-entries/${entry.body.id}`).set(ih).expect(404);

      // Usando o workspace do dono no header, sem ser membro dele, também é 404
      await intruder.agent.get(`/api/tasks/${owner.a.id}/time-entries`).set(owner.h).expect(404);

      const list = await owner.ana.agent.get(`/api/tasks/${owner.a.id}/time-entries`).set(owner.h).expect(200);
      expect(list.body.entries).toEqual([expect.objectContaining({ minutes: 15, note: null })]);
    });

    it('um timer ativo em outro workspace bloqueia o início (409) sem aparecer aqui', async () => {
      const { ana, h, a } = await setup();
      const other = await ana.agent.post('/api/workspaces').send({ name: 'Segundo' }).expect(201);
      const oh = { 'X-Workspace-Id': other.body.id };
      const op = await createProject(ana.agent, other.body.id);
      const ot = await createTask(ana.agent, other.body.id, op.id, { title: 'Tarefa secreta' });
      await ana.agent.post(`/api/tasks/${ot.id}/time-entries/start`).set(oh).expect(201);

      const res = await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(409);
      expect(res.body.error).toBe('TIMER_ALREADY_RUNNING');
      expect(JSON.stringify(res.body)).not.toContain('Tarefa secreta');
      expect((await ana.agent.get('/api/time-entries/current').set(h).expect(200)).body).toEqual({ timer: null });
      await ana.agent.post('/api/time-entries/current/stop').set(h).expect(404);
    });
  });
});
