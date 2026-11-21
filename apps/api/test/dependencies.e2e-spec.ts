import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

describe('Dependências entre tarefas (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  /** Usuário com workspace, um projeto e três tarefas. */
  async function setup() {
    const ctx = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': ctx.workspace.id };
    const project = await createProject(ctx.agent, ctx.workspace.id);
    const a = await createTask(ctx.agent, ctx.workspace.id, project.id, { title: 'A — montar vitrine' });
    const b = await createTask(ctx.agent, ctx.workspace.id, project.id, { title: 'B — catalogar acervo' });
    const c = await createTask(ctx.agent, ctx.workspace.id, project.id, { title: 'C — restaurar peças' });
    const link = (taskId: string, dependsOnTaskId: string) =>
      ctx.agent.post(`/api/tasks/${taskId}/dependencies`).set(h).send({ dependsOnTaskId });
    return { ...ctx, h, project, a, b, c, link };
  }

  it('401 sem login', async () => {
    const id = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
    await request(app.getHttpServer()).get(`/api/tasks/${id}/dependencies`).expect(401);
    await request(app.getHttpServer()).get(`/api/projects/${id}/dependencies`).expect(401);
  });

  it('cria a dependência e a mostra nas duas pontas', async () => {
    const { agent, h, a, b, link } = await setup();

    const created = await link(a.id, b.id).expect(201);
    expect(created.body).toMatchObject({ taskId: a.id, dependsOnTaskId: b.id });
    expect(typeof created.body.createdAt).toBe('string');

    const ofA = await agent.get(`/api/tasks/${a.id}/dependencies`).set(h).expect(200);
    expect(ofA.body).toEqual({
      blockedBy: [{ id: b.id, title: b.title, status: 'todo', startDate: null, dueDate: null }],
      blocking: [],
    });

    const ofB = await agent.get(`/api/tasks/${b.id}/dependencies`).set(h).expect(200);
    expect(ofB.body.blockedBy).toEqual([]);
    expect(ofB.body.blocking).toEqual([expect.objectContaining({ id: a.id, title: a.title })]);
  });

  it('lista as dependências do projeto para o Gantt', async () => {
    const { agent, h, project, a, b, c, link } = await setup();
    await link(a.id, b.id).expect(201);
    await link(b.id, c.id).expect(201);

    const res = await agent.get(`/api/projects/${project.id}/dependencies`).set(h).expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({ taskId: a.id, dependsOnTaskId: b.id }),
      expect.objectContaining({ taskId: b.id, dependsOnTaskId: c.id }),
    ]);
  });

  it('recusa ciclo direto e indireto (400 CIRCULAR_DEPENDENCY)', async () => {
    const { a, b, c, link } = await setup();
    await link(a.id, b.id).expect(201);
    await link(b.id, c.id).expect(201);

    const direct = await link(b.id, a.id).expect(400);
    expect(direct.body.error).toBe('CIRCULAR_DEPENDENCY');
    const indirect = await link(c.id, a.id).expect(400);
    expect(indirect.body.error).toBe('CIRCULAR_DEPENDENCY');
  });

  it('recusa depender de si mesma (400), repetir (409) e body inválido (422)', async () => {
    const { a, b, link } = await setup();

    expect((await link(a.id, a.id).expect(400)).body.error).toBe('SELF_DEPENDENCY');
    await link(a.id, b.id).expect(201);
    expect((await link(a.id, b.id).expect(409)).body.error).toBe('DEPENDENCY_EXISTS');
    await link(a.id, 'nao-e-uuid').expect(422);
  });

  it('recusa tarefas de projetos diferentes (400)', async () => {
    const { agent, workspace, a, link } = await setup();
    const other = await createProject(agent, workspace.id, 'Outro projeto');
    const x = await createTask(agent, workspace.id, other.id);

    expect((await link(a.id, x.id).expect(400)).body.error).toBe('DEPENDENCY_OTHER_PROJECT');
  });

  it('remove a dependência (204) e responde 404 se ela não existe', async () => {
    const { agent, h, a, b, link } = await setup();
    await link(a.id, b.id).expect(201);

    await agent.delete(`/api/tasks/${a.id}/dependencies/${b.id}`).set(h).expect(204);
    const after = await agent.get(`/api/tasks/${a.id}/dependencies`).set(h).expect(200);
    expect(after.body.blockedBy).toEqual([]);

    await agent.delete(`/api/tasks/${a.id}/dependencies/${b.id}`).set(h).expect(404);
  });

  it('projeto arquivado é somente leitura (409), mas a leitura continua', async () => {
    const { agent, h, project, a, b, c, link } = await setup();
    await link(a.id, b.id).expect(201);
    await agent.post(`/api/projects/${project.id}/archive`).set(h).expect(200);

    expect((await link(a.id, c.id).expect(409)).body.error).toBe('PROJECT_ARCHIVED');
    await agent.delete(`/api/tasks/${a.id}/dependencies/${b.id}`).set(h).expect(409);
    await agent.get(`/api/tasks/${a.id}/dependencies`).set(h).expect(200);
    await agent.get(`/api/projects/${project.id}/dependencies`).set(h).expect(200);
  });

  it('excluir uma tarefa apaga as dependências dela', async () => {
    const { agent, h, project, a, b, link } = await setup();
    await link(a.id, b.id).expect(201);

    await agent.delete(`/api/tasks/${b.id}`).set(h).expect(204);
    const res = await agent.get(`/api/projects/${project.id}/dependencies`).set(h).expect(200);
    expect(res.body).toEqual([]);
  });

  describe('isolamento entre workspaces', () => {
    it('não lê nem mexe nas dependências de outro workspace (404)', async () => {
      const owner = await setup();
      await owner.link(owner.a.id, owner.b.id).expect(201);
      const intruder = await registerUserWithWorkspace(app, 'Outro');
      const ih = { 'X-Workspace-Id': intruder.workspace.id };

      await intruder.agent.get(`/api/tasks/${owner.a.id}/dependencies`).set(ih).expect(404);
      await intruder.agent.get(`/api/projects/${owner.project.id}/dependencies`).set(ih).expect(404);
      await intruder.agent
        .post(`/api/tasks/${owner.a.id}/dependencies`)
        .set(ih)
        .send({ dependsOnTaskId: owner.c.id })
        .expect(404);
      await intruder.agent.delete(`/api/tasks/${owner.a.id}/dependencies/${owner.b.id}`).set(ih).expect(404);

      // Usando o workspace do dono no header, sem ser membro dele, também é 404
      await intruder.agent.get(`/api/tasks/${owner.a.id}/dependencies`).set(owner.h).expect(404);

      // Nada mudou para o dono
      const res = await owner.agent.get(`/api/projects/${owner.project.id}/dependencies`).set(owner.h).expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('não liga uma tarefa própria a uma tarefa de outro workspace (404)', async () => {
      const owner = await setup();
      const intruder = await registerUserWithWorkspace(app, 'Outro');
      const ip = await createProject(intruder.agent, intruder.workspace.id);
      const mine = await createTask(intruder.agent, intruder.workspace.id, ip.id);

      await intruder.agent
        .post(`/api/tasks/${mine.id}/dependencies`)
        .set({ 'X-Workspace-Id': intruder.workspace.id })
        .send({ dependsOnTaskId: owner.a.id })
        .expect(404);
    });
  });
});
