import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MailService } from '@/core/mail/mail.service';
import { registerUser, registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

describe('Campos personalizados (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  async function setup() {
    const context = await registerUserWithWorkspace(app);
    const headers = { 'X-Workspace-Id': context.workspace.id };
    const project = await createProject(context.agent, context.workspace.id);
    const task = await createTask(context.agent, context.workspace.id, project.id);
    return { ...context, headers, project, task };
  }

  it('401 sem login', async () => {
    const id = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
    const server = app.getHttpServer();
    await request(server).get(`/api/projects/${id}/custom-fields`).expect(401);
    await request(server).post(`/api/projects/${id}/custom-fields`).send({ name: 'X', type: 'text' }).expect(401);
    await request(server).get(`/api/projects/${id}/custom-field-values`).expect(401);
    await request(server).patch(`/api/custom-fields/${id}`).send({ name: 'X' }).expect(401);
    await request(server).delete(`/api/custom-fields/${id}`).expect(401);
    await request(server).get(`/api/tasks/${id}/custom-field-values`).expect(401);
    await request(server).patch(`/api/tasks/${id}/custom-field-values`).send({ values: {} }).expect(401);
  });

  it('lista os valores de todas as tarefas do projeto, só do próprio projeto', async () => {
    const { agent, headers, workspace, project, task } = await setup();
    const other = await createTask(agent, workspace.id, project.id);
    const fieldsUrl = `/api/projects/${project.id}/custom-fields`;
    const text = await agent.post(fieldsUrl).set(headers).send({ name: 'Código', type: 'text' }).expect(201);
    const number = await agent.post(fieldsUrl).set(headers).send({ name: 'Horas', type: 'number' }).expect(201);

    const valuesUrl = `/api/projects/${project.id}/custom-field-values`;
    expect((await agent.get(valuesUrl).set(headers).expect(200)).body).toEqual({});

    await agent
      .patch(`/api/tasks/${task.id}/custom-field-values`)
      .set(headers)
      .send({ values: { [text.body.id]: 'A-01', [number.body.id]: 3 } })
      .expect(200);
    await agent
      .patch(`/api/tasks/${other.id}/custom-field-values`)
      .set(headers)
      .send({ values: { [number.body.id]: 1.5 } })
      .expect(200);

    const secondProject = await createProject(agent, workspace.id, 'Outro projeto');
    const secondTask = await createTask(agent, workspace.id, secondProject.id);
    const secondField = await agent
      .post(`/api/projects/${secondProject.id}/custom-fields`)
      .set(headers)
      .send({ name: 'Código', type: 'text' })
      .expect(201);
    await agent
      .patch(`/api/tasks/${secondTask.id}/custom-field-values`)
      .set(headers)
      .send({ values: { [secondField.body.id]: 'B-01' } })
      .expect(200);

    expect((await agent.get(valuesUrl).set(headers).expect(200)).body).toEqual({
      [task.id]: { [text.body.id]: 'A-01', [number.body.id]: 3 },
      [other.id]: { [number.body.id]: 1.5 },
    });
    await agent.get('/api/projects/nao-e-uuid/custom-field-values').set(headers).expect(400);
  });

  it('não cria dois campos com o mesmo nome mesmo em requisições simultâneas', async () => {
    const { agent, headers, project } = await setup();
    const url = `/api/projects/${project.id}/custom-fields`;
    const responses = await Promise.all(
      ['Revisão', 'REVISÃO', 'revisão'].map((name) => agent.post(url).set(headers).send({ name, type: 'text' })),
    );

    expect(responses.map((res) => res.status).sort()).toEqual([201, 409, 409]);
    expect((await agent.get(url).set(headers).expect(200)).body).toHaveLength(1);
  });

  it('cria, lista, atualiza e exclui campos; lê, grava e valida valores da tarefa', async () => {
    const { agent, headers, project, task } = await setup();
    const base = `/api/projects/${project.id}/custom-fields`;
    const created = await agent
      .post(base)
      .set(headers)
      .send({ name: 'Categoria', type: 'dropdown', options: ['Peça', 'Documento'] })
      .expect(201);
    const fieldId = created.body.id as string;

    expect(created.body).toMatchObject({
      projectId: project.id,
      name: 'Categoria',
      type: 'dropdown',
      options: ['Peça', 'Documento'],
      isRequired: false,
    });
    expect((await agent.get(base).set(headers).expect(200)).body).toHaveLength(1);

    const valuesUrl = `/api/tasks/${task.id}/custom-field-values`;
    expect((await agent.get(valuesUrl).set(headers).expect(200)).body).toEqual({});
    const saved = await agent
      .patch(valuesUrl)
      .set(headers)
      .send({ values: { [fieldId]: 'Peça' } })
      .expect(200);
    expect(saved.body).toEqual({ [fieldId]: 'Peça' });

    const refusedOptions = await agent
      .patch(`/api/custom-fields/${fieldId}`)
      .set(headers)
      .send({ options: ['Documento'] })
      .expect(409);
    expect(refusedOptions.body.error).toBe('OPTION_IN_USE');

    const updated = await agent
      .patch(`/api/custom-fields/${fieldId}`)
      .set(headers)
      .send({ name: 'Tipo de item', options: ['Peça', 'Documento', 'Fotografia'] })
      .expect(200);
    expect(updated.body).toMatchObject({ name: 'Tipo de item', options: ['Peça', 'Documento', 'Fotografia'] });

    const invalid = await agent
      .patch(valuesUrl)
      .set(headers)
      .send({ values: { [fieldId]: 'Inválido' } })
      .expect(400);
    expect(invalid.body.error).toBe('INVALID_FIELD_VALUE');

    await agent.delete(`/api/custom-fields/${fieldId}`).set(headers).expect(204);
    expect((await agent.get(base).set(headers).expect(200)).body).toEqual([]);
    expect((await agent.get(valuesUrl).set(headers).expect(200)).body).toEqual({});
  });

  it('valida schema de criação e respeita campos obrigatórios', async () => {
    const { agent, headers, project, task } = await setup();
    const base = `/api/projects/${project.id}/custom-fields`;

    await agent.post(base).set(headers).send({ name: 'Sem opções', type: 'dropdown' }).expect(422);
    await agent
      .post(base)
      .set(headers)
      .send({ name: 'Checkbox com opções', type: 'checkbox', options: ['Sim'] })
      .expect(422);

    const created = await agent
      .post(base)
      .set(headers)
      .send({ name: 'Identificação', type: 'text', isRequired: true })
      .expect(201);
    const valuesUrl = `/api/tasks/${task.id}/custom-field-values`;

    const empty = await agent
      .patch(valuesUrl)
      .set(headers)
      .send({ values: { [created.body.id]: '' } })
      .expect(400);
    expect(empty.body.error).toBe('REQUIRED_FIELD');
    const nullValue = await agent
      .patch(valuesUrl)
      .set(headers)
      .send({ values: { [created.body.id]: null } })
      .expect(400);
    expect(nullValue.body.error).toBe('REQUIRED_FIELD');
    await agent
      .patch(valuesUrl)
      .set(headers)
      .send({ values: { [created.body.id]: 'Inventário 01' } })
      .expect(200);

    const checkbox = await agent
      .post(base)
      .set(headers)
      .send({ name: 'Conferido', type: 'checkbox', isRequired: true })
      .expect(201);

    await agent
      .patch(valuesUrl)
      .set(headers)
      .send({ values: { [checkbox.body.id]: false } })
      .expect(400);

    await agent
      .patch(valuesUrl)
      .set(headers)
      .send({ values: { [checkbox.body.id]: true } })
      .expect(200);
  });

  it('somente administradores gerenciam campos, mas membros podem preencher valores', async () => {
    const { agent: owner, workspace, project, task } = await setup();
    await owner.post(`/api/workspaces/${workspace.id}/invites`).send({ email: 'membro-campos@teste.com' }).expect(201);
    const email = app.get(MailService).outbox.at(-1);
    const token = email ? /token=([A-Za-z0-9_-]+)/.exec(email.text)?.[1] : undefined;
    if (!token) throw new Error('O token do convite não foi encontrado no e-mail de teste');

    const member = await registerUser(app, { email: 'membro-campos@teste.com' });
    await member.agent.post('/api/invites/accept').send({ token }).expect(200);
    const headers = { 'X-Workspace-Id': workspace.id };
    const fieldsUrl = `/api/projects/${project.id}/custom-fields`;

    await member.agent.get(fieldsUrl).set(headers).expect(200);
    await member.agent.post(fieldsUrl).set(headers).send({ name: 'Status', type: 'checkbox' }).expect(403);

    const field = await owner.post(fieldsUrl).set(headers).send({ name: 'Conferido', type: 'checkbox' }).expect(201);
    await member.agent.patch(`/api/custom-fields/${field.body.id}`).set(headers).send({ name: 'Outro' }).expect(403);
    await member.agent.delete(`/api/custom-fields/${field.body.id}`).set(headers).expect(403);
    await member.agent
      .patch(`/api/tasks/${task.id}/custom-field-values`)
      .set(headers)
      .send({ values: { [field.body.id]: true } })
      .expect(200);
  });

  it('projeto arquivado é somente leitura, mas os campos continuam disponíveis para leitura', async () => {
    const { agent, headers, project, task } = await setup();
    const fieldsUrl = `/api/projects/${project.id}/custom-fields`;
    const field = await agent.post(fieldsUrl).set(headers).send({ name: 'Código', type: 'text' }).expect(201);
    await agent.post(`/api/projects/${project.id}/archive`).set(headers).expect(200);

    expect((await agent.get(fieldsUrl).set(headers).expect(200)).body).toHaveLength(1);
    await agent.post(fieldsUrl).set(headers).send({ name: 'Novo', type: 'text' }).expect(409);
    await agent.patch(`/api/custom-fields/${field.body.id}`).set(headers).send({ name: 'Alterado' }).expect(409);
    await agent.delete(`/api/custom-fields/${field.body.id}`).set(headers).expect(409);
    await agent
      .patch(`/api/tasks/${task.id}/custom-field-values`)
      .set(headers)
      .send({ values: { [field.body.id]: 'X' } })
      .expect(409);
    await agent.get(`/api/tasks/${task.id}/custom-field-values`).set(headers).expect(200);
  });

  it('isola projetos, campos e tarefas entre workspaces (404)', async () => {
    const owner = await setup();
    const field = await owner.agent
      .post(`/api/projects/${owner.project.id}/custom-fields`)
      .set(owner.headers)
      .send({ name: 'Privado', type: 'text' })
      .expect(201);

    const intruder = await registerUserWithWorkspace(app, 'Outro workspace');
    const otherProject = await createProject(intruder.agent, intruder.workspace.id);
    const otherTask = await createTask(intruder.agent, intruder.workspace.id, otherProject.id);
    const otherHeaders = { 'X-Workspace-Id': intruder.workspace.id };

    await intruder.agent.get(`/api/projects/${owner.project.id}/custom-fields`).set(otherHeaders).expect(404);
    await intruder.agent
      .post(`/api/projects/${owner.project.id}/custom-fields`)
      .set(otherHeaders)
      .send({ name: 'Ataque', type: 'text' })
      .expect(404);
    await intruder.agent
      .patch(`/api/custom-fields/${field.body.id}`)
      .set(otherHeaders)
      .send({ name: 'Ataque' })
      .expect(404);
    await intruder.agent.delete(`/api/custom-fields/${field.body.id}`).set(otherHeaders).expect(404);
    await intruder.agent.get(`/api/tasks/${owner.task.id}/custom-field-values`).set(otherHeaders).expect(404);
    await intruder.agent.get(`/api/projects/${owner.project.id}/custom-field-values`).set(otherHeaders).expect(404);
    await intruder.agent
      .patch(`/api/tasks/${owner.task.id}/custom-field-values`)
      .set(otherHeaders)
      .send({ values: { [field.body.id]: 'Ataque' } })
      .expect(404);

    await intruder.agent.get(`/api/tasks/${otherTask.id}/custom-field-values`).set(owner.headers).expect(404);
    expect(
      (await owner.agent.get(`/api/projects/${owner.project.id}/custom-fields`).set(owner.headers).expect(200)).body,
    ).toHaveLength(1);
  });
});
