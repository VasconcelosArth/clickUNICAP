import { INestApplication } from '@nestjs/common';
import { MailService } from '@/core/mail/mail.service';
import { registerUser } from './auth-helpers';

type Agent = Awaited<ReturnType<typeof registerUser>>['agent'];

/** Cria um usuário novo e o coloca como membro do workspace (convite + aceite). */
export async function addMember(app: INestApplication, ownerAgent: Agent, workspaceId: string) {
  const email = `membro-${Date.now()}-${Math.round(Math.random() * 1e6)}@teste.com`;
  await ownerAgent.post(`/api/workspaces/${workspaceId}/invites`).send({ email }).expect(201);

  const text = app.get(MailService).outbox.at(-1)?.text ?? '';
  const token = /token=([A-Za-z0-9_-]+)/.exec(text)?.[1];
  if (!token) throw new Error('Token do convite não encontrado no e-mail de teste');

  const member = await registerUser(app, { email });
  await member.agent.post('/api/invites/accept').send({ token }).expect(200);
  return member;
}
