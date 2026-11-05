import type TestAgent from 'supertest/lib/agent';

/** Cria dados pela API, passando pelas mesmas regras do sistema. Use nos testes e2e das frentes. */
type Agent = InstanceType<typeof TestAgent>;

export async function createProject(agent: Agent, workspaceId: string, name = 'Projeto de teste') {
  const res = await agent.post('/api/projects').set('X-Workspace-Id', workspaceId).send({ name }).expect(201);
  return res.body as { id: string; workspaceId: string; name: string };
}

export async function createTask(
  agent: Agent,
  workspaceId: string,
  projectId: string,
  data: Record<string, unknown> = {},
) {
  const res = await agent
    .post(`/api/projects/${projectId}/tasks`)
    .set('X-Workspace-Id', workspaceId)
    .send({ title: 'Tarefa de teste', ...data })
    .expect(201);
  return res.body as { id: string; projectId: string; title: string; status: string; position: number };
}
