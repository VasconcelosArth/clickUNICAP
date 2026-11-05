import { INestApplication } from '@nestjs/common';
import { MailService } from '@/core/mail/mail.service';
import { registerUser, registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

describe('Workspaces (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  /** Convida `email` e devolve o token que foi no e-mail. */
  async function inviteAndGetToken(
    agent: Awaited<ReturnType<typeof registerUser>>['agent'],
    wsId: string,
    email: string,
  ) {
    await agent.post(`/api/workspaces/${wsId}/invites`).send({ email }).expect(201);
    const mail = app.get(MailService).outbox.at(-1)!;
    return /token=([A-Za-z0-9_-]+)/.exec(mail.text)![1]!;
  }

  it('cria workspace: o criador aparece como admin e dono', async () => {
    const { agent, user, workspace } = await registerUserWithWorkspace(app, 'Grupo 3');
    expect(workspace).toMatchObject({ name: 'Grupo 3', ownerId: user.id, myRole: 'admin' });

    const list = await agent.get('/api/workspaces').expect(200);
    expect(list.body).toHaveLength(1);
    const members = await agent.get(`/api/workspaces/${workspace.id}/members`).expect(200);
    expect(members.body).toEqual([expect.objectContaining({ userId: user.id, role: 'admin', isOwner: true })]);
  });

  it('ISOLAMENTO: quem não é membro recebe 404 em tudo do workspace', async () => {
    const { workspace } = await registerUserWithWorkspace(app);
    const { agent: intruso } = await registerUser(app);
    await intruso.get(`/api/workspaces/${workspace.id}`).expect(404);
    await intruso.get(`/api/workspaces/${workspace.id}/members`).expect(404);
    await intruso.patch(`/api/workspaces/${workspace.id}`).send({ name: 'hack' }).expect(404);
    await intruso.delete(`/api/workspaces/${workspace.id}`).expect(404);
    const list = await intruso.get('/api/workspaces').expect(200);
    expect(list.body).toEqual([]);
  });

  it('convite: o convidado cria conta com o e-mail do convite e aceita', async () => {
    const { agent: dono, workspace } = await registerUserWithWorkspace(app);
    const token = await inviteAndGetToken(dono, workspace.id, 'bia@teste.com');

    const { agent: bia } = await registerUser(app, { email: 'bia@teste.com' });
    const res = await bia.post('/api/invites/accept').send({ token }).expect(200);
    expect(res.body).toMatchObject({ id: workspace.id, myRole: 'member' });

    await bia.get(`/api/workspaces/${workspace.id}`).expect(200);
    await bia.post('/api/invites/accept').send({ token }).expect(400); // uso único
  });

  it('convite aberto com outra conta → 403', async () => {
    const { agent: dono, workspace } = await registerUserWithWorkspace(app);
    const token = await inviteAndGetToken(dono, workspace.id, 'bia@teste.com');
    const { agent: outra } = await registerUser(app, { email: 'outra@teste.com' });
    await outra.post('/api/invites/accept').send({ token }).expect(403);
  });

  it('membro comum não convida, não renomeia e não muda papéis (403)', async () => {
    const { agent: dono, workspace } = await registerUserWithWorkspace(app);
    const token = await inviteAndGetToken(dono, workspace.id, 'bia@teste.com');
    const { agent: bia, user: biaUser } = await registerUser(app, { email: 'bia@teste.com' });
    await bia.post('/api/invites/accept').send({ token });

    await bia.post(`/api/workspaces/${workspace.id}/invites`).send({ email: 'x@teste.com' }).expect(403);
    await bia.patch(`/api/workspaces/${workspace.id}`).send({ name: 'Novo' }).expect(403);
    await bia.patch(`/api/workspaces/${workspace.id}/members/${biaUser.id}`).send({ role: 'admin' }).expect(403);
  });

  it('admin promove, membro sai, dono não pode sair', async () => {
    const { agent: dono, user: donoUser, workspace } = await registerUserWithWorkspace(app);
    const token = await inviteAndGetToken(dono, workspace.id, 'bia@teste.com');
    const { agent: bia, user: biaUser } = await registerUser(app, { email: 'bia@teste.com' });
    await bia.post('/api/invites/accept').send({ token });

    await dono.patch(`/api/workspaces/${workspace.id}/members/${biaUser.id}`).send({ role: 'admin' }).expect(204);
    await dono.delete(`/api/workspaces/${workspace.id}/members/${donoUser.id}`).expect(403);
    await bia.delete(`/api/workspaces/${workspace.id}/members/${biaUser.id}`).expect(204);
    await bia.get(`/api/workspaces/${workspace.id}`).expect(404);
  });

  it('membro removido deixa de ser responsável só nas tarefas deste workspace', async () => {
    const { agent: dono, user: donoUser, workspace } = await registerUserWithWorkspace(app);
    const token = await inviteAndGetToken(dono, workspace.id, 'bia@teste.com');
    const { agent: bia, user: biaUser } = await registerUser(app, { email: 'bia@teste.com' });
    await bia.post('/api/invites/accept').send({ token }).expect(200);
    const biaWs = await bia.post('/api/workspaces').send({ name: 'Da Bia' }).expect(201);

    const project = await createProject(dono, workspace.id);
    const task = await createTask(dono, workspace.id, project.id, { assigneeId: biaUser.id });
    const otherProject = await createProject(bia, biaWs.body.id);
    const otherTask = await createTask(bia, biaWs.body.id, otherProject.id, { assigneeId: biaUser.id });

    await dono.delete(`/api/workspaces/${workspace.id}/members/${biaUser.id}`).expect(204);

    const after = await dono.get(`/api/tasks/${task.id}`).set('X-Workspace-Id', workspace.id).expect(200);
    expect(after.body.assigneeId).toBeNull();
    const untouched = await bia.get(`/api/tasks/${otherTask.id}`).set('X-Workspace-Id', biaWs.body.id).expect(200);
    expect(untouched.body.assigneeId).toBe(biaUser.id);

    // O admin consegue atribuir a tarefa a outro membro, mas não de volta a quem saiu.
    const taskUrl = `/api/tasks/${task.id}`;
    const reassign = (assigneeId: string) =>
      dono.patch(taskUrl).set('X-Workspace-Id', workspace.id).send({ assigneeId });
    const refused = await reassign(biaUser.id).expect(400);
    expect(refused.body.error).toBe('INVALID_ASSIGNEE');
    const reassigned = await reassign(donoUser.id).expect(200);
    expect(reassigned.body.assigneeId).toBe(donoUser.id);
  });

  it('reconvidar substitui o convite: só o link novo funciona', async () => {
    const { agent: dono, workspace } = await registerUserWithWorkspace(app);
    const antigo = await inviteAndGetToken(dono, workspace.id, 'bia@teste.com');
    const novo = await inviteAndGetToken(dono, workspace.id, 'bia@teste.com');

    const pendentes = await dono.get(`/api/workspaces/${workspace.id}/invites`).expect(200);
    expect(pendentes.body).toHaveLength(1);

    const { agent: bia } = await registerUser(app, { email: 'bia@teste.com' });
    await bia.post('/api/invites/accept').send({ token: antigo }).expect(400);
    await bia.post('/api/invites/accept').send({ token: novo }).expect(200);
  });

  it('convidar quem já é membro → 409; revogar convite funciona', async () => {
    const { agent: dono, user: donoUser, workspace } = await registerUserWithWorkspace(app);
    const res = await dono.post(`/api/workspaces/${workspace.id}/invites`).send({ email: donoUser.email }).expect(409);
    expect(res.body.error).toBe('ALREADY_MEMBER');

    const inv = await dono.post(`/api/workspaces/${workspace.id}/invites`).send({ email: 'z@teste.com' }).expect(201);
    expect(inv.body).not.toHaveProperty('tokenHash');
    await dono.delete(`/api/workspaces/${workspace.id}/invites/${inv.body.id}`).expect(204);
    const pend = await dono.get(`/api/workspaces/${workspace.id}/invites`).expect(200);
    expect(pend.body).toEqual([]);
  });

  it('só o dono apaga o workspace', async () => {
    const { agent: dono, workspace } = await registerUserWithWorkspace(app);
    await dono.delete(`/api/workspaces/${workspace.id}`).expect(204);
    await dono.get(`/api/workspaces/${workspace.id}`).expect(404);
  });
});
