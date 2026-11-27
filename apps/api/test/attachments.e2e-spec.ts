import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Attachment } from '@clickunicap/shared';
import { AppModule } from '@/app.module';
import { AppConfig } from '@/core/config';
import { configureApp } from '@/main';
import { AttachmentsService } from '@/modules/attachments/attachments.service';
import { ATTACHMENT_STORAGE } from '@/modules/attachments/storage/attachment-storage';
import { MemoryAttachmentStorage } from '@/modules/attachments/storage/memory-attachment-storage';
import { registerUser, registerUserWithWorkspace } from './utils/auth-helpers';
import { resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

type Agent = Awaited<ReturnType<typeof registerUser>>['agent'];

const PDF = 'application/pdf';
const pdfBuffer = (extra = '') => Buffer.from(`%PDF-1.7 ${extra}`);

/** Os arquivos saem do storage depois da resposta (evento depois do commit): espera até a condição valer. */
async function eventually(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('A condição não foi atendida a tempo');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe('Anexos (e2e)', () => {
  let app: INestApplication;
  // Storage em memória: nenhum arquivo real é gravado durante os testes.
  const storage = new MemoryAttachmentStorage();
  let memberCounter = 0;

  beforeAll(async () => {
    // Mesma configuração do createTestApp, só trocando o storage em disco pelo de teste.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ATTACHMENT_STORAGE)
      .useValue(storage)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    for (const key of storage.keys()) await storage.remove(key);
  });
  afterAll(() => app.close());

  const headers = (workspaceId: string) => ({ 'X-Workspace-Id': workspaceId });

  function upload(
    agent: Agent,
    workspaceId: string,
    taskId: string,
    file: Buffer = pdfBuffer(),
    options: { filename: string; contentType: string } = { filename: 'doc.pdf', contentType: PDF },
  ) {
    return agent.post(`/api/tasks/${taskId}/attachments`).set(headers(workspaceId)).attach('file', file, options);
  }

  /** Convida um e-mail novo, aceita o convite e devolve o membro (papel "member"). */
  async function addMember(owner: Agent, workspaceId: string) {
    memberCounter += 1;
    const email = `membro${memberCounter}-${Date.now()}@teste.com`;
    await owner.post(`/api/workspaces/${workspaceId}/invites`).send({ email }).expect(201);
    const { MailService } = await import('@/core/mail/mail.service');
    const token = /token=([A-Za-z0-9_-]+)/.exec(app.get(MailService).outbox.at(-1)?.text ?? '')?.[1];
    if (!token) throw new Error('Token do convite não encontrado no e-mail de teste');
    const { agent, user } = await registerUser(app, { email });
    await agent.post('/api/invites/accept').send({ token }).expect(200);
    return { agent, user };
  }

  async function setup() {
    const owner = await registerUserWithWorkspace(app);
    const project = await createProject(owner.agent, owner.workspace.id);
    const task = await createTask(owner.agent, owner.workspace.id, project.id);
    return { ...owner, project, task, h: headers(owner.workspace.id) };
  }

  it('401 sem login e 422 sem o header do workspace', async () => {
    await request(app.getHttpServer()).get(`/api/attachments/${randomUUID()}`).expect(401);
    await request(app.getHttpServer()).get(`/api/tasks/${randomUUID()}/attachments`).expect(401);
    const { agent } = await registerUser(app);
    await agent.get(`/api/attachments/${randomUUID()}`).expect(422);
  });

  it('envia, lista, consulta e baixa um anexo (sem vazar o storageKey)', async () => {
    const { agent, user, workspace, task, h } = await setup();

    const created = await upload(agent, workspace.id, task.id, Buffer.from('olá, anexo'), {
      filename: 'relatório.txt',
      contentType: 'text/plain',
    }).expect(201);
    const attachment = created.body as Attachment;
    expect(attachment).toMatchObject({
      taskId: task.id,
      fileName: 'relatório.txt',
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength('olá, anexo'),
      uploadedBy: user.id,
    });
    expect(Object.keys(attachment).sort()).toEqual([
      'createdAt',
      'fileName',
      'id',
      'mimeType',
      'sizeBytes',
      'taskId',
      'uploadedBy',
    ]);
    expect(storage.size).toBe(1);

    const list = await agent.get(`/api/tasks/${task.id}/attachments`).set(h).expect(200);
    expect(list.body).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain('storageKey');

    const meta = await agent.get(`/api/attachments/${attachment.id}`).set(h).expect(200);
    expect(meta.body).toEqual(attachment);

    const download = await agent.get(`/api/attachments/${attachment.id}/download`).set(h).expect(200);
    expect(download.text).toBe('olá, anexo');
    expect(download.headers['content-type']).toContain('text/plain');
    expect(download.headers['content-disposition']).toContain('attachment');
    expect(download.headers['content-disposition']).toContain('relat%C3%B3rio.txt');
    expect(download.headers['x-content-type-options']).toBe('nosniff');
  });

  it('lista só os anexos da tarefa pedida', async () => {
    const { agent, workspace, project, task, h } = await setup();
    const other = await createTask(agent, workspace.id, project.id, { title: 'Outra' });
    await upload(agent, workspace.id, task.id, pdfBuffer('a')).expect(201);
    await upload(agent, workspace.id, task.id, pdfBuffer('b')).expect(201);
    await upload(agent, workspace.id, other.id, pdfBuffer('c')).expect(201);

    expect((await agent.get(`/api/tasks/${task.id}/attachments`).set(h).expect(200)).body).toHaveLength(2);
    expect((await agent.get(`/api/tasks/${other.id}/attachments`).set(h).expect(200)).body).toHaveLength(1);
  });

  it('422 e nada gravado: tipo não permitido, conteúdo disfarçado, arquivo vazio e sem arquivo', async () => {
    const { agent, workspace, task, h } = await setup();

    const exe = await upload(agent, workspace.id, task.id, pdfBuffer(), {
      filename: 'virus.exe',
      contentType: 'application/octet-stream',
    }).expect(422);
    expect(exe.body.error).toBe('FILE_TYPE_NOT_ALLOWED');

    const html = await upload(agent, workspace.id, task.id, Buffer.from('<script>alert(1)</script>'), {
      filename: 'foto.png',
      contentType: 'image/png',
    }).expect(422);
    expect(html.body.error).toBe('FILE_CONTENT_MISMATCH');

    const wrongMime = await upload(agent, workspace.id, task.id, pdfBuffer(), {
      filename: 'doc.pdf',
      contentType: 'text/html',
    }).expect(422);
    expect(wrongMime.body.error).toBe('FILE_CONTENT_MISMATCH');

    const empty = await upload(agent, workspace.id, task.id, Buffer.alloc(0)).expect(422);
    expect(empty.body.error).toBe('EMPTY_FILE');

    const noFile = await agent.post(`/api/tasks/${task.id}/attachments`).set(h).send({}).expect(422);
    expect(noFile.body.error).toBe('FILE_REQUIRED');

    expect(storage.size).toBe(0);
    expect((await agent.get(`/api/tasks/${task.id}/attachments`).set(h).expect(200)).body).toEqual([]);
  });

  it('422 e nada gravado: arquivo acima do tamanho máximo', async () => {
    const { agent, workspace, task, h } = await setup();
    const { maxBytes } = app.get(AppConfig).uploads;
    const tooBig = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(maxBytes)]);

    const res = await upload(agent, workspace.id, task.id, tooBig).expect(422);
    expect(res.body.error).toBe('FILE_TOO_LARGE');
    expect(storage.size).toBe(0);
    expect((await agent.get(`/api/tasks/${task.id}/attachments`).set(h).expect(200)).body).toEqual([]);
  });

  it('nome de arquivo malicioso é sanitizado e o storage usa só chaves geradas pelo servidor', async () => {
    const { agent, workspace, task } = await setup();

    const res = await upload(agent, workspace.id, task.id, pdfBuffer(), {
      filename: '..\\..\\evil.pdf',
      contentType: PDF,
    }).expect(201);
    expect((res.body as Attachment).fileName).toBe('evil.pdf');

    const html = await upload(agent, workspace.id, task.id, pdfBuffer('2'), {
      filename: '<script>.pdf',
      contentType: PDF,
    }).expect(201);
    expect((html.body as Attachment).fileName).toBe('_script_.pdf');

    expect(storage.size).toBe(2);
    for (const key of storage.keys()) {
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });

  it('IDs malformados são rejeitados antes de qualquer consulta', async () => {
    const { agent, workspace, h } = await setup();
    const statuses = await Promise.all([
      agent.get('/api/attachments/nao-e-uuid').set(h),
      agent.get('/api/attachments/nao-e-uuid/download').set(h),
      agent.delete('/api/attachments/nao-e-uuid').set(h),
      agent.get('/api/tasks/nao-e-uuid/attachments').set(h),
      upload(agent, workspace.id, 'nao-e-uuid'),
    ]);
    for (const res of statuses) expect([400, 422]).toContain(res.status);
  });

  it('404 para tarefa e anexo inexistentes', async () => {
    const { agent, workspace, h } = await setup();
    await upload(agent, workspace.id, randomUUID()).expect(404);
    await agent.get(`/api/tasks/${randomUUID()}/attachments`).set(h).expect(404);
    await agent.get(`/api/attachments/${randomUUID()}`).set(h).expect(404);
    await agent.get(`/api/attachments/${randomUUID()}/download`).set(h).expect(404);
    await agent.delete(`/api/attachments/${randomUUID()}`).set(h).expect(404);
  });

  it('download devolve 404 se o arquivo sumiu do storage', async () => {
    const { agent, workspace, task, h } = await setup();
    const created = await upload(agent, workspace.id, task.id).expect(201);
    for (const key of storage.keys()) await storage.remove(key);
    await agent
      .get(`/api/attachments/${(created.body as Attachment).id}/download`)
      .set(h)
      .expect(404);
  });

  it('ISOLAMENTO: outro workspace recebe 404 em todas as rotas e o anexo continua intacto', async () => {
    const a = await setup();
    const b = await registerUserWithWorkspace(app, 'B');
    const hb = headers(b.workspace.id);
    const created = await upload(a.agent, a.workspace.id, a.task.id).expect(201);
    const id = (created.body as Attachment).id;

    await upload(b.agent, b.workspace.id, a.task.id).expect(404);
    await b.agent.get(`/api/tasks/${a.task.id}/attachments`).set(hb).expect(404);
    await b.agent.get(`/api/attachments/${id}`).set(hb).expect(404);
    await b.agent.get(`/api/attachments/${id}/download`).set(hb).expect(404);
    await b.agent.delete(`/api/attachments/${id}`).set(hb).expect(404);
    // Mesmo usando o workspace do dono no header, quem não é membro não passa.
    await b.agent.get(`/api/attachments/${id}`).set(a.h).expect(404);

    expect(storage.size).toBe(1);
    await a.agent.get(`/api/attachments/${id}/download`).set(a.h).expect(200);
  });

  it('remover: quem enviou ou o admin podem; outro membro recebe 403', async () => {
    const { agent: owner, workspace, task, h } = await setup();
    const bia = await addMember(owner, workspace.id);
    const caio = await addMember(owner, workspace.id);

    const biaFile = (await upload(bia.agent, workspace.id, task.id, pdfBuffer('bia')).expect(201)).body as Attachment;
    expect(biaFile.uploadedBy).toBe(bia.user.id);

    await caio.agent.delete(`/api/attachments/${biaFile.id}`).set(h).expect(403);
    expect(storage.size).toBe(1);

    await bia.agent.delete(`/api/attachments/${biaFile.id}`).set(h).expect(204); // quem enviou
    expect(storage.size).toBe(0);
    await owner.get(`/api/attachments/${biaFile.id}`).set(h).expect(404);

    const caioFile = (await upload(caio.agent, workspace.id, task.id, pdfBuffer('caio')).expect(201))
      .body as Attachment;
    await owner.delete(`/api/attachments/${caioFile.id}`).set(h).expect(204); // admin do workspace
    expect(storage.size).toBe(0);
  });

  it('projeto arquivado: leitura continua, upload e remoção dão 409 PROJECT_ARCHIVED', async () => {
    const { agent, workspace, project, task, h } = await setup();
    const created = await upload(agent, workspace.id, task.id).expect(201);
    const id = (created.body as Attachment).id;
    await agent.post(`/api/projects/${project.id}/archive`).set(h).expect(200);

    const refusedUpload = await upload(agent, workspace.id, task.id, pdfBuffer('novo')).expect(409);
    expect(refusedUpload.body.error).toBe('PROJECT_ARCHIVED');
    const refusedDelete = await agent.delete(`/api/attachments/${id}`).set(h).expect(409);
    expect(refusedDelete.body.error).toBe('PROJECT_ARCHIVED');
    expect(storage.size).toBe(1);

    await agent.get(`/api/tasks/${task.id}/attachments`).set(h).expect(200);
    await agent.get(`/api/attachments/${id}`).set(h).expect(200);
    await agent.get(`/api/attachments/${id}/download`).set(h).expect(200);

    await agent.post(`/api/projects/${project.id}/unarchive`).set(h).expect(200);
    await agent.delete(`/api/attachments/${id}`).set(h).expect(204);
    expect(storage.size).toBe(0);
  });

  it('falha no storage durante o upload: erro 500 e nenhum registro órfão', async () => {
    const { agent, workspace, task, h } = await setup();
    storage.failOnNextSave();

    await upload(agent, workspace.id, task.id).expect(500);
    expect(storage.size).toBe(0);
    expect((await agent.get(`/api/tasks/${task.id}/attachments`).set(h).expect(200)).body).toEqual([]);

    await upload(agent, workspace.id, task.id).expect(201); // volta ao normal
  });

  it('remover o anexo continua dando 204 mesmo se o storage falhar (o registro some)', async () => {
    const { agent, workspace, task, h } = await setup();
    const id = ((await upload(agent, workspace.id, task.id).expect(201)).body as Attachment).id;
    storage.failOnNextRemove();

    await agent.delete(`/api/attachments/${id}`).set(h).expect(204);
    await agent.get(`/api/attachments/${id}`).set(h).expect(404);
  });

  it('excluir a tarefa apaga os registros dos anexos dela (on delete cascade)', async () => {
    const { agent, workspace, task, h } = await setup();
    const id = ((await upload(agent, workspace.id, task.id).expect(201)).body as Attachment).id;

    await agent.delete(`/api/tasks/${task.id}`).set(h).expect(204);
    await agent.get(`/api/attachments/${id}`).set(h).expect(404);
    await agent.get(`/api/attachments/${id}/download`).set(h).expect(404);
  });

  it('excluir a tarefa apaga os arquivos dela do storage, sem tocar nos de outra tarefa', async () => {
    const { agent, workspace, project, task, h } = await setup();
    const other = await createTask(agent, workspace.id, project.id);
    await upload(agent, workspace.id, task.id).expect(201);
    await upload(agent, workspace.id, task.id, pdfBuffer('2')).expect(201);
    await upload(agent, workspace.id, other.id).expect(201);
    const [first, second, kept] = storage.keys();

    await agent.delete(`/api/tasks/${task.id}`).set(h).expect(204);

    await eventually(() => !storage.has(first ?? '') && !storage.has(second ?? ''));
    expect(storage.keys()).toEqual([kept]);
    await agent.get(`/api/tasks/${other.id}/attachments`).set(h).expect(200);
  });

  it('excluir a tarefa continua dando 204 se o storage falhar ao apagar o arquivo', async () => {
    const { agent, workspace, task, h } = await setup();
    await upload(agent, workspace.id, task.id).expect(201);
    storage.failOnNextRemove();

    await agent.delete(`/api/tasks/${task.id}`).set(h).expect(204);
    await agent.get(`/api/tasks/${task.id}`).set(h).expect(404);
    await eventually(() => !storage.failsNextRemove); // a falha aconteceu e foi só para o log
    expect(storage.size).toBe(1);
  });

  it('exclusão recusada (projeto arquivado) mantém os arquivos', async () => {
    const { agent, workspace, project, task, h } = await setup();
    await upload(agent, workspace.id, task.id).expect(201);
    await agent.post(`/api/projects/${project.id}/archive`).set(h).expect(200);

    await agent.delete(`/api/tasks/${task.id}`).set(h).expect(409);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(storage.size).toBe(1);
  });

  it('excluir o workspace apaga os arquivos de todas as tarefas dele, sem tocar nos de outro workspace', async () => {
    const { agent, workspace, project, task } = await setup();
    const other = await createTask(agent, workspace.id, project.id);
    await upload(agent, workspace.id, task.id).expect(201);
    await upload(agent, workspace.id, other.id).expect(201);
    const elsewhere = await setup();
    await upload(elsewhere.agent, elsewhere.workspace.id, elsewhere.task.id).expect(201);
    const kept = storage.keys().at(-1);

    await agent.delete(`/api/workspaces/${workspace.id}`).expect(204);

    await eventually(() => storage.size === 1);
    expect(storage.keys()).toEqual([kept]);
  });

  it('limpeza de órfãos: apaga só arquivos antigos sem registro', async () => {
    const { agent, workspace, task } = await setup();
    await upload(agent, workspace.id, task.id).expect(201);
    const [withRecord] = storage.keys();
    const orphan = randomUUID();
    const recentOrphan = randomUUID();
    await storage.save(orphan, Buffer.from('x'));
    await storage.save(recentOrphan, Buffer.from('x'));
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000);
    storage.setModifiedAt(withRecord ?? '', twoHoursAgo);
    storage.setModifiedAt(orphan, twoHoursAgo);

    const removed = await app.get(AttachmentsService).removeOrphanFiles(new Date(Date.now() - 60 * 60_000));

    expect(removed).toBe(1);
    expect(storage.keys().sort()).toEqual([withRecord, recentOrphan].sort());
  });

  it('Swagger publica as rotas de anexos (upload multipart)', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const uploadRoute = res.body.paths['/api/tasks/{taskId}/attachments'].post;
    expect(uploadRoute.requestBody.content['multipart/form-data'].schema.properties).toHaveProperty('file');
    expect(res.body.paths['/api/attachments/{id}/download'].get).toBeDefined();
    expect(res.body.paths['/api/attachments/{id}'].delete).toBeDefined();
  });
});
