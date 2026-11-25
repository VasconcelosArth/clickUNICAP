import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { notificationPageSchema, notificationSchema, unreadCountSchema } from '@clickunicap/shared';
import { MailService } from '@/core/mail/mail.service';
import { type CommentMentionedPayload, DomainEvents, type TaskDueSoonPayload } from '@/core/events';
import { registerUser, registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

describe('Notificações (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  /** Dono (Ana) com workspace e projeto, e uma segunda pessoa (Bia) que entrou por convite. */
  async function setup() {
    const ana = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': ana.workspace.id };
    await ana.agent.post(`/api/workspaces/${ana.workspace.id}/invites`).send({ email: 'bia@teste.com' }).expect(201);
    const token = /token=([A-Za-z0-9_-]+)/.exec(app.get(MailService).outbox.at(-1)!.text)![1];
    const bia = await registerUser(app, { name: 'Bia', email: 'bia@teste.com' });
    await bia.agent.post('/api/invites/accept').send({ token }).expect(200);
    const project = await createProject(ana.agent, ana.workspace.id);
    return { ana, bia, h, project };
  }

  /** Os ouvintes rodam depois da resposta HTTP: espera a caixa de entrada chegar ao total esperado. */
  async function waitForUnread(agent: ReturnType<typeof request.agent>, h: Record<string, string>, count: number) {
    for (let i = 0; i < 50; i++) {
      const res = await agent.get('/api/notifications/unread-count').set(h).expect(200);
      if (res.body.count === count) return;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`A caixa de entrada não chegou a ${count} não lidas`);
  }

  it('401 sem login', async () => {
    await request(app.getHttpServer()).get('/api/notifications').expect(401);
    await request(app.getHttpServer()).get('/api/notifications/unread-count').expect(401);
  });

  it('atribuir a tarefa a outra pessoa notifica essa pessoa, com o título e o autor', async () => {
    const { ana, bia, h, project } = await setup();
    const task = await createTask(ana.agent, ana.workspace.id, project.id, {
      title: 'Montar a vitrine',
      assigneeId: bia.user.id,
    });

    await waitForUnread(bia.agent, h, 1);
    const res = await bia.agent.get('/api/notifications').set(h).expect(200);
    expect(() => notificationPageSchema.parse(res.body)).not.toThrow();
    expect(res.body).toEqual({
      data: [
        expect.objectContaining({
          type: 'task_assigned',
          refId: task.id,
          readAt: null,
          payload: {
            taskId: task.id,
            taskTitle: 'Montar a vitrine',
            projectId: project.id,
            actorId: ana.user.id,
            actorName: ana.user.name,
          },
        }),
      ],
      nextCursor: null,
    });

    // quem atribuiu não recebe nada
    const own = await ana.agent.get('/api/notifications').set(h).expect(200);
    expect(own.body.data).toEqual([]);
  });

  it('atribuir a si mesmo não gera notificação', async () => {
    const { ana, bia, h, project } = await setup();
    await createTask(ana.agent, ana.workspace.id, project.id, { assigneeId: ana.user.id });
    // a segunda tarefa (para a Bia) serve de marcador: quando ela chega, a primeira já foi processada
    await createTask(ana.agent, ana.workspace.id, project.id, { assigneeId: bia.user.id });
    await waitForUnread(bia.agent, h, 1);
    const res = await ana.agent.get('/api/notifications/unread-count').set(h).expect(200);
    expect(res.body).toEqual({ count: 0 });
  });

  it('menção em comentário e prazo chegando viram notificações', async () => {
    const { ana, bia, h, project } = await setup();
    const task = await createTask(ana.agent, ana.workspace.id, project.id);
    const events = app.get(EventEmitter2);
    const commentId = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
    const mention: CommentMentionedPayload = {
      commentId,
      taskId: task.id,
      mentionedUserId: bia.user.id,
      by: ana.user.id,
      workspaceId: ana.workspace.id,
    };
    const dueSoon: TaskDueSoonPayload = { taskId: task.id, assigneeId: bia.user.id, workspaceId: ana.workspace.id };
    events.emit(DomainEvents.CommentMentioned, mention);
    events.emit(DomainEvents.TaskDueSoon, dueSoon);

    await waitForUnread(bia.agent, h, 2);
    const res = await bia.agent.get('/api/notifications').set(h).expect(200);
    const byType = Object.fromEntries(res.body.data.map((n: { type: string }) => [n.type, n]));
    expect(byType.comment_mentioned).toMatchObject({
      refId: commentId,
      payload: { commentId, actorName: ana.user.name },
    });
    expect(byType.task_due_soon).toMatchObject({ refId: task.id, payload: { actorId: null, actorName: null } });
  });

  it('marca uma como lida, filtra as não lidas e marca todas', async () => {
    const { ana, bia, h, project } = await setup();
    for (const title of ['A', 'B', 'C']) {
      await createTask(ana.agent, ana.workspace.id, project.id, { title, assigneeId: bia.user.id });
    }
    await waitForUnread(bia.agent, h, 3);
    const all = await bia.agent.get('/api/notifications').set(h).expect(200);
    const first = all.body.data[0];

    const read = await bia.agent.post(`/api/notifications/${first.id}/read`).set(h).expect(200);
    expect(() => notificationSchema.parse(read.body)).not.toThrow();
    expect(typeof read.body.readAt).toBe('string');
    // marcar de novo mantém a data original
    const again = await bia.agent.post(`/api/notifications/${first.id}/read`).set(h).expect(200);
    expect(again.body.readAt).toBe(read.body.readAt);

    const count = await bia.agent.get('/api/notifications/unread-count').set(h).expect(200);
    expect(() => unreadCountSchema.parse(count.body)).not.toThrow();
    expect(count.body).toEqual({ count: 2 });
    const unread = await bia.agent.get('/api/notifications?unread=true').set(h).expect(200);
    expect(unread.body.data.map((n: { id: string }) => n.id)).not.toContain(first.id);

    await bia.agent.post('/api/notifications/read-all').set(h).expect(204);
    expect((await bia.agent.get('/api/notifications/unread-count').set(h)).body).toEqual({ count: 0 });
    expect((await bia.agent.get('/api/notifications').set(h)).body.data).toHaveLength(3);
  });

  it('pagina das mais novas para as mais antigas', async () => {
    const { ana, bia, h, project } = await setup();
    for (const title of ['1', '2', '3']) {
      await createTask(ana.agent, ana.workspace.id, project.id, { title, assigneeId: bia.user.id });
    }
    await waitForUnread(bia.agent, h, 3);

    const page1 = await bia.agent.get('/api/notifications?limit=2').set(h).expect(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.nextCursor).toBe(page1.body.data[1].id);
    const page2 = await bia.agent.get(`/api/notifications?limit=2&cursor=${page1.body.nextCursor}`).set(h).expect(200);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.nextCursor).toBeNull();

    const ids = [...page1.body.data, ...page2.body.data].map((n: { id: string }) => n.id);
    expect(new Set(ids).size).toBe(3);
    const dates = [...page1.body.data, ...page2.body.data].map((n: { createdAt: string }) => n.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('notificação de outro usuário ou de outro workspace → 404', async () => {
    const { ana, bia, h, project } = await setup();
    await createTask(ana.agent, ana.workspace.id, project.id, { assigneeId: bia.user.id });
    await waitForUnread(bia.agent, h, 1);
    const [notification] = (await bia.agent.get('/api/notifications').set(h)).body.data;

    // Ana é do mesmo workspace, mas a notificação é da Bia
    await ana.agent.post(`/api/notifications/${notification.id}/read`).set(h).expect(404);
    await ana.agent.get(`/api/notifications?cursor=${notification.id}`).set(h).expect(404);

    // Bia em outro workspace dela não vê a notificação
    const other = await bia.agent.post('/api/workspaces').send({ name: 'Outro' }).expect(201);
    const h2 = { 'X-Workspace-Id': other.body.id };
    await bia.agent.post(`/api/notifications/${notification.id}/read`).set(h2).expect(404);
    expect((await bia.agent.get('/api/notifications').set(h2)).body.data).toEqual([]);

    // quem não é do workspace nem entra
    const stranger = await registerUser(app);
    await stranger.agent.get('/api/notifications').set(h).expect(404);
  });

  it('valida parâmetros', async () => {
    const { bia, h } = await setup();
    await bia.agent.get('/api/notifications?unread=sim').set(h).expect(422);
    await bia.agent.get('/api/notifications?limit=0').set(h).expect(422);
    await bia.agent.post('/api/notifications/nao-e-uuid/read').set(h).expect(400);
  });
});
