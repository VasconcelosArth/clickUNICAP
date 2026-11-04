import { INestApplication } from '@nestjs/common';
import request from 'supertest';

let counter = 0;

/**
 * Cria um usuário novo via API e devolve um `agent` já logado (com os cookies).
 * Use nos testes e2e de qualquer módulo:
 *   const { agent, user } = await registerUser(app);
 */
export async function registerUser(app: INestApplication, overrides: { name?: string; email?: string } = {}) {
  counter += 1;
  const email = overrides.email ?? `user${counter}-${Date.now()}@teste.com`;
  const agent = request.agent(app.getHttpServer());
  const res = await agent
    .post('/api/auth/register')
    .send({ name: overrides.name ?? `Usuário ${counter}`, email, password: 'senha-forte-1' })
    .expect(201);
  return { agent, user: res.body.user as { id: string; email: string; name: string } };
}

/** Cria um usuário com um workspace próprio (ele é dono e admin). */
export async function registerUserWithWorkspace(app: INestApplication, name = 'Workspace de teste') {
  const { agent, user } = await registerUser(app);
  const res = await agent.post('/api/workspaces').send({ name }).expect(201);
  return { agent, user, workspace: res.body as { id: string; name: string } };
}
