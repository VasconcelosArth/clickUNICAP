import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  currentTimerSchema,
  startTimerResultSchema,
  taskTimeEntriesSchema,
  timeEntrySchema,
  timeReportSchema,
} from '@clickunicap/shared';
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
    await http.post(`/api/tasks/${id}/time-entries`).send({ minutes: 15 }).expect(401);
    await http.patch(`/api/time-entries/${id}`).send({ minutes: 15 }).expect(401);
    await http.delete(`/api/time-entries/${id}`).expect(401);
  });

  it('inicia, mostra o timer ativo, para e lista com o total', async () => {
    const { ana, h, a } = await setup();

    const started = await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);
    expect(() => startTimerResultSchema.parse(started.body)).not.toThrow();
    expect(started.body.timer).toMatchObject({ taskId: a.id, userId: ana.user.id, endedAt: null, minutes: null });
    expect(started.body.stopped).toBeNull();
    const timerId = started.body.timer.id;

    const current = await ana.agent.get('/api/time-entries/current').set(h).expect(200);
    expect(() => currentTimerSchema.parse(current.body)).not.toThrow();
    expect(current.body.timer).toMatchObject({ id: timerId, taskTitle: 'Montar a vitrine' });

    const stopped = await ana.agent.post('/api/time-entries/current/stop').set(h).expect(200);
    expect(() => timeEntrySchema.parse(stopped.body)).not.toThrow();
    expect(stopped.body).toMatchObject({ id: timerId, minutes: 0 });
    expect(typeof stopped.body.endedAt).toBe('string');

    expect((await ana.agent.get('/api/time-entries/current').set(h).expect(200)).body).toEqual({ timer: null });
    await ana.agent.post('/api/time-entries/current/stop').set(h).expect(404);

    await ana.agent.post(`/api/tasks/${a.id}/time-entries`).set(h).send({ minutes: 45, note: 'Reunião' }).expect(201);
    const list = await ana.agent.get(`/api/tasks/${a.id}/time-entries`).set(h).expect(200);
    expect(() => taskTimeEntriesSchema.parse(list.body)).not.toThrow();
    expect(list.body.totalMinutes).toBe(45);
    expect(list.body.entries).toHaveLength(2);
    // Mais recentes primeiro pelo início: o manual "terminou agora", então começou 45 min antes do timer
    expect(list.body.entries[0]).toMatchObject({ id: timerId, minutes: 0 });
    expect(list.body.entries[1]).toMatchObject({ minutes: 45, note: 'Reunião', userName: ana.user.name });
  });

  it('iniciar em outra tarefa para o timer anterior e devolve ele em `stopped`', async () => {
    const { ana, h, a, b } = await setup();
    const first = await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);

    const second = await ana.agent.post(`/api/tasks/${b.id}/time-entries/start`).set(h).expect(201);
    expect(second.body.timer).toMatchObject({ taskId: b.id, endedAt: null });
    expect(second.body.stopped).toMatchObject({ id: first.body.timer.id, taskId: a.id, minutes: 0 });
    expect(typeof second.body.stopped.endedAt).toBe('string');

    const current = await ana.agent.get('/api/time-entries/current').set(h).expect(200);
    expect(current.body.timer).toMatchObject({ id: second.body.timer.id, taskTitle: 'Catalogar acervo' });
    const ofA = await ana.agent.get(`/api/tasks/${a.id}/time-entries`).set(h).expect(200);
    expect(ofA.body.entries).toEqual([expect.objectContaining({ id: first.body.timer.id, minutes: 0 })]);
  });

  it('iniciar na tarefa que já conta devolve o mesmo timer, sem criar outra entrada', async () => {
    const { ana, h, a } = await setup();
    const first = await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);

    const again = await ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h).expect(201);
    expect(again.body).toEqual({ timer: first.body.timer, stopped: null });
    const list = await ana.agent.get(`/api/tasks/${a.id}/time-entries`).set(h).expect(200);
    expect(list.body.entries).toHaveLength(1);
  });

  it('dois inícios ao mesmo tempo terminam com 1 timer ativo e o outro parado', async () => {
    const { ana, h, a, b } = await setup();

    const responses = await Promise.all([
      ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h),
      ana.agent.post(`/api/tasks/${b.id}/time-entries/start`).set(h),
    ]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);

    const lists = await Promise.all(
      [a, b].map((t) => ana.agent.get(`/api/tasks/${t.id}/time-entries`).set(h).expect(200)),
    );
    const all: { endedAt: string | null }[] = lists.flatMap((l) => l.body.entries);
    expect(all).toHaveLength(2);
    expect(all.filter((e) => e.endedAt === null)).toHaveLength(1);
  });

  it('clique duplo na mesma tarefa cria um timer só', async () => {
    const { ana, h, a } = await setup();

    const responses = await Promise.all([
      ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h),
      ana.agent.post(`/api/tasks/${a.id}/time-entries/start`).set(h),
    ]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    expect(responses[0].body.timer.id).toBe(responses[1].body.timer.id);
    const list = await ana.agent.get(`/api/tasks/${a.id}/time-entries`).set(h).expect(200);
    expect(list.body.entries).toHaveLength(1);
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

    const res = await ana.agent
      .patch(`/api/time-entries/${started.body.timer.id}`)
      .set(h)
      .send({ minutes: 5 })
      .expect(409);
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
      expect(res.body.error).toBe('TIMER_RUNNING_ELSEWHERE');
      expect(JSON.stringify(res.body)).not.toContain('Tarefa secreta');
      expect((await ana.agent.get('/api/time-entries/current').set(h).expect(200)).body).toEqual({ timer: null });
      await ana.agent.post('/api/time-entries/current/stop').set(h).expect(404);

      // O timer do outro workspace não foi parado
      const there = await ana.agent.get('/api/time-entries/current').set(oh).expect(200);
      expect(there.body.timer).toMatchObject({ taskId: ot.id, endedAt: null });
    });
  });

  describe('relatório de horas', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();
    const period = { from: daysAgo(30), to: new Date(Date.now() + DAY).toISOString() };

    it('401 sem login', async () => {
      const id = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
      await request(app.getHttpServer()).get(`/api/projects/${id}/time-report`).query(period).expect(401);
    });

    it('soma o tempo parado do período por membro e por tarefa', async () => {
      const { ana, bia, h, project, a, b } = await setup();
      const lanca = (agent: typeof ana.agent, taskId: string, minutes: number, startedAt: string) =>
        agent.post(`/api/tasks/${taskId}/time-entries`).set(h).send({ minutes, startedAt }).expect(201);
      await lanca(ana.agent, a.id, 60, daysAgo(10));
      await lanca(ana.agent, b.id, 30, daysAgo(9));
      await lanca(bia.agent, a.id, 45, daysAgo(8));
      // Fora do relatório: antes do período, timer que ainda conta e tempo de outro projeto
      await lanca(ana.agent, a.id, 15, daysAgo(40));
      await bia.agent.post(`/api/tasks/${b.id}/time-entries/start`).set(h).expect(201);
      const other = await createProject(ana.agent, ana.workspace.id, 'Outro projeto');
      const ot = await createTask(ana.agent, ana.workspace.id, other.id, { title: 'Fora' });
      await lanca(ana.agent, ot.id, 20, daysAgo(5));

      const res = await bia.agent.get(`/api/projects/${project.id}/time-report`).set(h).query(period).expect(200);

      expect(() => timeReportSchema.parse(res.body)).not.toThrow();
      expect(res.body).toEqual({
        from: period.from,
        to: period.to,
        totalMinutes: 135,
        byMember: [
          { userId: ana.user.id, userName: ana.user.name, minutes: 90 },
          { userId: bia.user.id, userName: 'Bia', minutes: 45 },
        ],
        byTask: [
          { taskId: a.id, taskTitle: 'Montar a vitrine', minutes: 105 },
          { taskId: b.id, taskTitle: 'Catalogar acervo', minutes: 30 },
        ],
      });
    });

    it('conta cada entrada inteira pelo início: [from, to)', async () => {
      const { ana, h, project, a } = await setup();
      const from = new Date(Date.now() - 20 * DAY);
      const to = new Date(Date.now() - 10 * DAY);
      const at = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60_000).toISOString();
      const lanca = (minutes: number, startedAt: string) =>
        ana.agent.post(`/api/tasks/${a.id}/time-entries`).set(h).send({ minutes, startedAt }).expect(201);
      await lanca(10, from.toISOString()); // começa no início: entra
      await lanca(60, at(to, -30)); // começa dentro e termina fora: entra inteira
      await lanca(60, at(from, -30)); // começa antes e termina dentro: fica de fora
      await lanca(5, to.toISOString()); // começa no fim, que é aberto: fica de fora

      const res = await ana.agent
        .get(`/api/projects/${project.id}/time-report`)
        .set(h)
        .query({ from: from.toISOString(), to: to.toISOString() })
        .expect(200);
      expect(res.body.totalMinutes).toBe(70);
    });

    it('sem tempo no período, devolve zero e listas vazias', async () => {
      const { ana, h, project } = await setup();

      const res = await ana.agent.get(`/api/projects/${project.id}/time-report`).set(h).query(period).expect(200);
      expect(res.body).toMatchObject({ totalMinutes: 0, byMember: [], byTask: [] });
    });

    it('valida o período (422)', async () => {
      const { ana, h, project } = await setup();
      const get = (query: object) => ana.agent.get(`/api/projects/${project.id}/time-report`).set(h).query(query);

      await get({}).expect(422);
      await get({ from: period.to, to: period.from }).expect(422);
      await get({ from: '2026-11-01', to: '2026-11-30' }).expect(422);
      await get({ from: daysAgo(400), to: period.to }).expect(422);
    });

    it('não mostra o relatório de outro workspace (404)', async () => {
      const owner = await setup();
      await owner.ana.agent
        .post(`/api/tasks/${owner.a.id}/time-entries`)
        .set(owner.h)
        .send({ minutes: 15 })
        .expect(201);
      const intruder = await registerUserWithWorkspace(app, 'Outro');
      const ih = { 'X-Workspace-Id': intruder.workspace.id };
      const url = `/api/projects/${owner.project.id}/time-report`;

      await intruder.agent.get(url).set(ih).query(period).expect(404);
      // Usando o workspace do dono no header, sem ser membro dele, também é 404
      await intruder.agent.get(url).set(owner.h).query(period).expect(404);
    });
  });
});
