import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { DomainEvents } from '@/core/events';
import { registerUser, registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

describe('Projetos e tarefas (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  it('401 sem login e 422 sem o header do workspace', async () => {
    await request(app.getHttpServer()).get('/api/projects').expect(401);
    const { agent } = await registerUser(app);
    await agent.get('/api/projects').expect(422);
  });

  it('projeto: cria, edita com PATCH vazio e arquiva (some da lista padrão)', async () => {
    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);

    await agent.patch(`/api/projects/${p.id}`).set(h).send({}).expect(200);
    const edited = await agent.patch(`/api/projects/${p.id}`).set(h).send({ name: 'Novo' }).expect(200);
    expect(edited.body.name).toBe('Novo');

    await agent.post(`/api/projects/${p.id}/archive`).set(h).expect(200);
    expect((await agent.get('/api/projects').set(h).expect(200)).body).toEqual([]);
    const all = await agent.get('/api/projects?includeArchived=true').set(h).expect(200);
    expect(all.body).toHaveLength(1);

    await agent.post(`/api/projects/${p.id}/tasks`).set(h).send({ title: 'x' }).expect(409);
    await agent.post(`/api/projects/${p.id}/unarchive`).set(h).expect(200);
    await agent.post(`/api/projects/${p.id}/tasks`).set(h).send({ title: 'x' }).expect(201);
  });

  it('ISOLAMENTO: membro de outro workspace recebe 404 em projeto e tarefa alheios', async () => {
    const a = await registerUserWithWorkspace(app, 'A');
    const b = await registerUserWithWorkspace(app, 'B');
    const p = await createProject(a.agent, a.workspace.id);
    const t = await createTask(a.agent, a.workspace.id, p.id);
    const hb = { 'X-Workspace-Id': b.workspace.id };

    await b.agent.get(`/api/projects/${p.id}`).set(hb).expect(404);
    await b.agent.get(`/api/projects/${p.id}/tasks`).set(hb).expect(404);
    await b.agent.post(`/api/projects/${p.id}/tasks`).set(hb).send({ title: 'x' }).expect(404);
    await b.agent.get(`/api/tasks/${t.id}`).set(hb).expect(404);
    await b.agent.patch(`/api/tasks/${t.id}`).set(hb).send({ title: 'hack' }).expect(404);
    await b.agent.delete(`/api/tasks/${t.id}`).set(hb).expect(404);
    await b.agent.get(`/api/tasks/${t.id}`).set({ 'X-Workspace-Id': a.workspace.id }).expect(404);
    await a.agent.get(`/api/tasks/${t.id}`).set({ 'X-Workspace-Id': a.workspace.id }).expect(200);
  });

  it('tarefa: posição, conclusão, validações, exclusão e evento', async () => {
    const { agent, user, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    const received: unknown[] = [];
    const listener = (e: unknown) => received.push(e);
    const emitter = app.get(EventEmitter2);
    emitter.on(DomainEvents.TaskAssigned, listener);

    const t1 = await createTask(agent, workspace.id, p.id, { assigneeId: user.id });
    const t2 = await createTask(agent, workspace.id, p.id);
    await agent.patch(`/api/tasks/${t2.id}`).set(h).send({}).expect(200);
    await agent.patch('/api/users/me').send({}).expect(200);
    expect([t1.position, t2.position]).toEqual([1, 2]);
    expect(received).toHaveLength(1);
    emitter.off(DomainEvents.TaskAssigned, listener);

    const { user: fora } = await registerUser(app);
    const bad = await agent.patch(`/api/tasks/${t2.id}`).set(h).send({ assigneeId: fora.id }).expect(400);
    expect(bad.body.error).toBe('INVALID_ASSIGNEE');
    await agent.post(`/api/projects/${p.id}/tasks`).set(h).send({ title: '' }).expect(422);

    await agent.patch(`/api/tasks/${t1.id}`).set(h).send({ startDate: '2026-12-10' }).expect(200);
    const dates = await agent.patch(`/api/tasks/${t1.id}`).set(h).send({ dueDate: '2026-12-01' }).expect(400);
    expect(dates.body.error).toBe('INVALID_DATE_RANGE');

    const done = await agent.patch(`/api/tasks/${t1.id}`).set(h).send({ status: 'done' }).expect(200);
    expect(done.body.completedAt).not.toBeNull();
    const reopened = await agent.patch(`/api/tasks/${t1.id}`).set(h).send({ status: 'todo' }).expect(200);
    expect(reopened.body.completedAt).toBeNull();
    expect(reopened.body.position).toBe(3);

    await agent.delete(`/api/tasks/${t1.id}`).set(h).expect(204);
    await agent.get(`/api/tasks/${t1.id}`).set(h).expect(404);
  });

  it('filtros: status, prioridade, responsável, prazo e busca literal', async () => {
    const { agent, user, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const p = await createProject(agent, workspace.id);
    await createTask(agent, workspace.id, p.id, { title: 'Desconto 50% agora', priority: 'high', assigneeId: user.id });
    await createTask(agent, workspace.id, p.id, { title: 'Escrever docs', status: 'done', dueDate: '2026-12-01' });
    await createTask(agent, workspace.id, p.id, { title: 'Revisar', dueDate: '2026-12-20' });

    const titles = async (q: string) => {
      const res = await agent.get(`/api/projects/${p.id}/tasks?${q}`).set(h).expect(200);
      return (res.body as { title: string }[]).map((t) => t.title).sort();
    };
    expect(await titles('')).toHaveLength(3);
    expect(await titles('status=done')).toEqual(['Escrever docs']);
    expect(await titles('priority=high')).toEqual(['Desconto 50% agora']);
    expect(await titles(`assigneeId=${user.id}`)).toEqual(['Desconto 50% agora']);
    expect(await titles('dueFrom=2026-12-10')).toEqual(['Revisar']);
    expect(await titles('search=DOCS')).toEqual(['Escrever docs']);
    expect(await titles('search=%25')).toEqual(['Desconto 50% agora']);
    await agent.get(`/api/projects/${p.id}/tasks?status=xpto`).set(h).expect(422);
  });

  it('membro comum não arquiva projeto (403), mas cria tarefa', async () => {
    const { agent: dono, workspace } = await registerUserWithWorkspace(app);
    const p = await createProject(dono, workspace.id);
    await dono.post(`/api/workspaces/${workspace.id}/invites`).send({ email: 'bia@teste.com' }).expect(201);
    const { MailService } = await import('@/core/mail/mail.service');
    const token = /token=([A-Za-z0-9_-]+)/.exec(app.get(MailService).outbox.at(-1)!.text)![1];
    const { agent: bia } = await registerUser(app, { email: 'bia@teste.com' });
    await bia.post('/api/invites/accept').send({ token }).expect(200);

    const h = { 'X-Workspace-Id': workspace.id };
    await bia.post(`/api/projects/${p.id}/archive`).set(h).expect(403);
    await bia.post(`/api/projects/${p.id}/tasks`).set(h).send({ title: 'Minha' }).expect(201);
  });

  it('Swagger publica as rotas com o schema do body', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const route = res.body.paths['/api/projects/{projectId}/tasks'];
    expect(route.post.requestBody.content['application/json'].schema.properties).toHaveProperty('title');
  });
});
