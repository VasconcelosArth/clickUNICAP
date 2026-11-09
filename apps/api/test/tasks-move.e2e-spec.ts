import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { DomainEvents, type TaskStatusChangedPayload } from '@/core/events';
import { registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

const none = { beforeTaskId: null, afterTaskId: null };

describe('Kanban: mover tarefa (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  /** Títulos de uma coluna, na ordem do quadro. */
  async function column(
    agent: Parameters<typeof createProject>[0],
    workspaceId: string,
    projectId: string,
    status: string,
  ) {
    const res = await agent
      .get(`/api/projects/${projectId}/tasks`)
      .query({ status })
      .set('X-Workspace-Id', workspaceId)
      .expect(200);
    return (res.body as { id: string; title: string; position: number }[]).map((t) => t.title);
  }

  it('move entre colunas: muda o status e entra no fim da coluna de destino', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t1 = await createTask(agent, workspace.id, p.id, { title: 'Um' });
    await createTask(agent, workspace.id, p.id, { title: 'Dois' });
    const doing = await createTask(agent, workspace.id, p.id, { title: 'Em curso', status: 'in_progress' });

    const moved = await agent
      .post(`/api/tasks/${t1.id}/move`)
      .set(h)
      .send({ status: 'in_progress', ...none })
      .expect(201);

    expect(moved.body).toMatchObject({ status: 'in_progress', position: doing.position + 1, completedAt: null });
    expect(await column(agent, workspace.id, p.id, 'in_progress')).toEqual(['Em curso', 'Um']);
    expect(await column(agent, workspace.id, p.id, 'todo')).toEqual(['Dois']);
  });

  it('concluir pelo Kanban marca completedAt e emite task.status_changed', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);

    const received: TaskStatusChangedPayload[] = [];
    const listener = (e: TaskStatusChangedPayload) => received.push(e);
    const emitter = app.get(EventEmitter2);
    emitter.on(DomainEvents.TaskStatusChanged, listener);

    const done = await agent
      .post(`/api/tasks/${t.id}/move`)
      .set(h)
      .send({ status: 'done', ...none })
      .expect(201);
    emitter.off(DomainEvents.TaskStatusChanged, listener);

    expect(done.body.completedAt).not.toBeNull();
    expect(received).toEqual([
      expect.objectContaining({ taskId: t.id, from: 'todo', to: 'done', workspaceId: workspace.id }),
    ]);
  });

  it('reordenar na mesma coluna e posicionar entre dois vizinhos (ponto médio)', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const a = await createTask(agent, workspace.id, p.id, { title: 'A' });
    const b = await createTask(agent, workspace.id, p.id, { title: 'B' });
    const c = await createTask(agent, workspace.id, p.id, { title: 'C' });

    const moved = await agent
      .post(`/api/tasks/${c.id}/move`)
      .set(h)
      .send({ status: 'todo', beforeTaskId: a.id, afterTaskId: b.id })
      .expect(201);

    expect(moved.body.position).toBe(1.5);
    expect(await column(agent, workspace.id, p.id, 'todo')).toEqual(['A', 'C', 'B']);
  });

  it('muitas inserções no mesmo ponto renumeram a coluna e mantêm a ordem', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const a = await createTask(agent, workspace.id, p.id, { title: 'A' });
    let upper = await createTask(agent, workspace.id, p.id, { title: 'B' });

    // Cada cartão novo entra entre "A" e o último inserido: o espaço cai pela metade e, mais cedo ou
    // mais tarde, a coluna precisa ser renumerada (docs/06).
    for (let i = 0; i < 30; i++) {
      const x = await createTask(agent, workspace.id, p.id, { title: `X${i}` });
      await agent
        .post(`/api/tasks/${x.id}/move`)
        .set(h)
        .send({ status: 'todo', beforeTaskId: a.id, afterTaskId: upper.id })
        .expect(201);
      upper = x;
    }

    const res = await agent.get(`/api/projects/${p.id}/tasks`).query({ status: 'todo' }).set(h).expect(200);
    const positions = (res.body as { position: number }[]).map((t) => t.position);
    expect(new Set(positions).size).toBe(positions.length);
    expect(positions).toEqual([...positions].sort((x, y) => x - y));
    // Cada X entrou logo depois de "A", então a ordem final é o inverso da inserção.
    const expected = Array.from({ length: 30 }, (_, i) => `X${29 - i}`);
    expect((res.body as { title: string }[]).map((t) => t.title)).toEqual(['A', ...expected, 'B']);
  });

  it('concorrência: vizinhos iguais para 8 movimentos ao mesmo tempo → só um vence, nada duplica', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const a = await createTask(agent, workspace.id, p.id, { title: 'A' });
    const b = await createTask(agent, workspace.id, p.id, { title: 'B' });
    // Criação em sequência: o create() atual não trava a coluna, e criações simultâneas podem repetir
    // posições (pendência registrada). Este teste mede a concorrência das MOVIMENTAÇÕES.
    const movers: { id: string }[] = [];
    for (let i = 0; i < 8; i++) movers.push(await createTask(agent, workspace.id, p.id, { title: `M${i}` }));

    const results = await Promise.all(
      movers.map((m) =>
        agent.post(`/api/tasks/${m.id}/move`).set(h).send({ status: 'todo', beforeTaskId: a.id, afterTaskId: b.id }),
      ),
    );

    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    expect(results.find((r) => r.status === 409)?.body.error).toBe('POSITION_CHANGED');

    const res = await agent.get(`/api/projects/${p.id}/tasks`).query({ status: 'todo' }).set(h).expect(200);
    const positions = (res.body as { position: number }[]).map((t) => t.position);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('ISOLAMENTO: membro de outro workspace recebe 404 e a tarefa não muda', async () => {
    const a = await registerUserWithWorkspace(app, 'A');
    const b = await registerUserWithWorkspace(app, 'B');
    const p = await createProject(a.agent, a.workspace.id);
    const t = await createTask(a.agent, a.workspace.id, p.id);

    await b.agent
      .post(`/api/tasks/${t.id}/move`)
      .set({ 'X-Workspace-Id': b.workspace.id })
      .send({ status: 'done', ...none })
      .expect(404);

    const still = await a.agent.get(`/api/tasks/${t.id}`).set({ 'X-Workspace-Id': a.workspace.id }).expect(200);
    expect(still.body).toMatchObject({ status: 'todo', completedAt: null });
  });

  it('tarefa inexistente → 404', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    await agent
      .post('/api/tasks/00000000-0000-4000-8000-000000000000/move')
      .set({ 'X-Workspace-Id': workspace.id })
      .send({ status: 'done', ...none })
      .expect(404);
  });

  it('projeto arquivado → 409 PROJECT_ARCHIVED e a tarefa não muda', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);
    await agent.post(`/api/projects/${p.id}/archive`).set(h).expect(200);

    const refused = await agent
      .post(`/api/tasks/${t.id}/move`)
      .set(h)
      .send({ status: 'done', ...none })
      .expect(409);
    expect(refused.body.error).toBe('PROJECT_ARCHIVED');
    await agent.post(`/api/projects/${p.id}/unarchive`).set(h).expect(200);
    await agent
      .get(`/api/tasks/${t.id}`)
      .set(h)
      .expect(200)
      .expect((r) => expect(r.body.status).toBe('todo'));
  });

  it('vizinho de outra coluna ou projeto → 409 POSITION_CHANGED', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);
    const emCurso = await createTask(agent, workspace.id, p.id, { status: 'in_progress' });

    const res = await agent
      .post(`/api/tasks/${t.id}/move`)
      .set(h)
      .send({ status: 'todo', beforeTaskId: emCurso.id, afterTaskId: null })
      .expect(409);
    expect(res.body.error).toBe('POSITION_CHANGED');
  });

  it('a tarefa não pode ser vizinha de si mesma → 400 INVALID_NEIGHBOR', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);
    const res = await agent
      .post(`/api/tasks/${t.id}/move`)
      .set(h)
      .send({ status: 'todo', beforeTaskId: t.id, afterTaskId: null })
      .expect(400);
    expect(res.body.error).toBe('INVALID_NEIGHBOR');
  });

  it('validação: status inválido, campo ausente ou id malformado', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const t = await createTask(agent, workspace.id, p.id);

    await agent
      .post(`/api/tasks/${t.id}/move`)
      .set(h)
      .send({ status: 'xpto', ...none })
      .expect(422);
    await agent.post(`/api/tasks/${t.id}/move`).set(h).send({ status: 'done' }).expect(422);
    await agent
      .post(`/api/tasks/${t.id}/move`)
      .set(h)
      .send({ status: 'done', beforeTaskId: 'nao-e-uuid', afterTaskId: null })
      .expect(422);
    await agent
      .post('/api/tasks/nao-e-uuid/move')
      .set(h)
      .send({ status: 'done', ...none })
      .expect(400);
  });

  it('Swagger documenta a rota de mover com o schema do body', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const route = res.body.paths['/api/tasks/{id}/move'];
    expect(route.post.requestBody.content['application/json'].schema.properties).toHaveProperty('status');
  });
});
