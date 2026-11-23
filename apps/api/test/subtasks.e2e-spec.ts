import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

const RANDOM_UUID = '3f2a9c1e-1111-4111-8111-111111111111';

describe('Subtarefas (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  it('401 sem login', async () => {
    await request(app.getHttpServer()).get(`/api/tasks/${RANDOM_UUID}/subtasks`).expect(401);
    await request(app.getHttpServer()).patch(`/api/subtasks/${RANDOM_UUID}`).send({}).expect(401);
  });

  it('cria no fim da lista, lista em ordem, edita, conclui e apaga', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);
    const url = `/api/tasks/${t.id}/subtasks`;

    const s1 = await agent.post(url).set(h).send({ title: 'Primeira' }).expect(201);
    const s2 = await agent.post(url).set(h).send({ title: 'Segunda' }).expect(201);
    expect([s1.body.position, s2.body.position]).toEqual([1, 2]);
    expect(s1.body.isDone).toBe(false);

    const list = await agent.get(url).set(h).expect(200);
    expect((list.body as { title: string }[]).map((s) => s.title)).toEqual(['Primeira', 'Segunda']);

    const done = await agent.patch(`/api/subtasks/${s1.body.id}`).set(h).send({ isDone: true }).expect(200);
    expect(done.body.isDone).toBe(true);
    const renamed = await agent.patch(`/api/subtasks/${s1.body.id}`).set(h).send({ title: 'Nova' }).expect(200);
    expect(renamed.body).toMatchObject({ title: 'Nova', isDone: true });

    await agent.delete(`/api/subtasks/${s1.body.id}`).set(h).expect(204);
    const after = await agent.get(url).set(h).expect(200);
    expect(after.body).toHaveLength(1);
  });

  it('422 com título vazio, texto com caractere nulo e PATCH sem campos', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);
    const url = `/api/tasks/${t.id}/subtasks`;

    await agent.post(url).set(h).send({ title: '' }).expect(422);
    await agent.post(url).set(h).send({ title: 'a\u0000b' }).expect(422);
    const s = await agent.post(url).set(h).send({ title: 'ok' }).expect(201);
    await agent.patch(`/api/subtasks/${s.body.id}`).set(h).send({}).expect(422);
  });

  it('ISOLAMENTO: outro workspace recebe 404 na tarefa e na subtarefa', async () => {
    const a = await registerUserWithWorkspace(app, 'A');
    const b = await registerUserWithWorkspace(app, 'B');
    const p = await createProject(a.agent, a.workspace.id);
    const t = await createTask(a.agent, a.workspace.id, p.id);
    const s = await a.agent
      .post(`/api/tasks/${t.id}/subtasks`)
      .set('X-Workspace-Id', a.workspace.id)
      .send({ title: 'Minha' })
      .expect(201);
    const hb = { 'X-Workspace-Id': b.workspace.id };

    await b.agent.get(`/api/tasks/${t.id}/subtasks`).set(hb).expect(404);
    await b.agent.post(`/api/tasks/${t.id}/subtasks`).set(hb).send({ title: 'x' }).expect(404);
    await b.agent.patch(`/api/subtasks/${s.body.id}`).set(hb).send({ isDone: true }).expect(404);
    await b.agent.delete(`/api/subtasks/${s.body.id}`).set(hb).expect(404);

    const intact = await a.agent
      .get(`/api/tasks/${t.id}/subtasks`)
      .set({ 'X-Workspace-Id': a.workspace.id })
      .expect(200);
    expect(intact.body).toHaveLength(1);
    expect(intact.body[0].isDone).toBe(false);
  });

  it('projeto arquivado é somente leitura (409), mas a lista continua visível', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);
    const url = `/api/tasks/${t.id}/subtasks`;
    const s = await agent.post(url).set(h).send({ title: 'Antes' }).expect(201);

    await agent.post(`/api/projects/${p.id}/archive`).set(h).expect(200);

    const refused = await agent.post(url).set(h).send({ title: 'Depois' }).expect(409);
    expect(refused.body.error).toBe('PROJECT_ARCHIVED');
    await agent.patch(`/api/subtasks/${s.body.id}`).set(h).send({ isDone: true }).expect(409);
    await agent.delete(`/api/subtasks/${s.body.id}`).set(h).expect(409);
    await agent.get(url).set(h).expect(200);

    await agent.post(`/api/projects/${p.id}/unarchive`).set(h).expect(200);
    await agent.patch(`/api/subtasks/${s.body.id}`).set(h).send({ isDone: true }).expect(200);
  });

  it('apagar a tarefa apaga as subtarefas (cascade)', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);
    const s = await agent.post(`/api/tasks/${t.id}/subtasks`).set(h).send({ title: 'x' }).expect(201);

    await agent.delete(`/api/tasks/${t.id}`).set(h).expect(204);
    await agent.patch(`/api/subtasks/${s.body.id}`).set(h).send({ isDone: true }).expect(404);
  });
});
