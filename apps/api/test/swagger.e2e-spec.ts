import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  memberWithUserSchema,
  myWorkspaceSchema,
  projectSchema,
  sessionResponseSchema,
  taskSchema,
  userSchema,
  workspaceInviteSchema,
} from '@clickunicap/shared';
import { registerUserWithWorkspace } from './utils/auth-helpers';
import { createTestApp, resetDatabase } from './utils/create-test-app';
import { createProject, createTask } from './utils/factories';

type Operation = { responses: Record<string, { content?: Record<string, { schema?: object }> }> };

describe('Swagger (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  it('toda rota documenta a resposta de sucesso; só as 204 ficam sem corpo', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const paths = res.body.paths as Record<string, Record<string, Operation>>;

    const problems: string[] = [];
    for (const [path, operations] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const success = Object.entries(operation.responses).filter(([status]) => status.startsWith('2'));
        const documented = success.every(
          ([status, r]) => status === '204' || Boolean(r.content?.['application/json']?.schema),
        );
        if (success.length !== 1 || !documented) problems.push(`${method} ${path}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('as respostas reais seguem os schemas publicados', async () => {
    const http = request(app.getHttpServer());
    const session = await http
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'contrato@teste.com', password: 'senha-forte-1' })
      .expect(201);
    expect(() => sessionResponseSchema.parse(session.body)).not.toThrow();

    const { agent, workspace } = await registerUserWithWorkspace(app);
    const h = { 'X-Workspace-Id': workspace.id };
    const project = await createProject(agent, workspace.id);
    const task = await createTask(agent, workspace.id, project.id, { dueDate: '2026-12-01' });
    const invite = await agent
      .post(`/api/workspaces/${workspace.id}/invites`)
      .send({ email: 'z@teste.com' })
      .expect(201);

    const parse = async (url: string, schema: { parse: (v: unknown) => unknown }) => {
      const res = await agent.get(url).set(h).expect(200);
      expect(() => schema.parse(res.body)).not.toThrow();
    };
    await parse('/api/users/me', userSchema);
    await parse(`/api/workspaces/${workspace.id}`, myWorkspaceSchema);
    await parse(`/api/workspaces/${workspace.id}/members`, memberWithUserSchema.array());
    await parse(`/api/workspaces/${workspace.id}/invites`, workspaceInviteSchema.array());
    await parse(`/api/projects/${project.id}`, projectSchema);
    await parse(`/api/tasks/${task.id}`, taskSchema);
    expect(() => workspaceInviteSchema.parse(invite.body)).not.toThrow();
  });
});
