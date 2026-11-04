import { z } from 'zod';
import { MEMBER_ROLES } from '../enums';
import { dateTimeSchema, idSchema } from './common.schema';

export const memberRoleSchema = z.enum(MEMBER_ROLES);

export const workspaceSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(80),
  ownerId: idSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Workspace = z.infer<typeof workspaceSchema>;

/** Workspace na lista "meus workspaces": inclui o papel de quem está pedindo. */
export const myWorkspaceSchema = workspaceSchema.extend({ myRole: memberRoleSchema });
export type MyWorkspace = z.infer<typeof myWorkspaceSchema>;

export const createWorkspaceSchema = z.object({ name: z.string().trim().min(1, 'Informe o nome').max(80) });
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export const updateWorkspaceSchema = createWorkspaceSchema;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const workspaceMemberSchema = z.object({
  workspaceId: idSchema,
  userId: idSchema,
  role: memberRoleSchema,
  joinedAt: dateTimeSchema,
});
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;

/** Membro com os dados públicos do usuário (lista de membros, seletor de responsável). */
export const memberWithUserSchema = workspaceMemberSchema.extend({
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  isOwner: z.boolean(),
});
export type MemberWithUser = z.infer<typeof memberWithUserSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  role: memberRoleSchema.default('member'),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const workspaceInviteSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  email: z.string().email(),
  role: memberRoleSchema,
  invitedBy: idSchema,
  expiresAt: dateTimeSchema,
  createdAt: dateTimeSchema,
});
export type WorkspaceInvite = z.infer<typeof workspaceInviteSchema>;

export const acceptInviteSchema = z.object({ token: z.string().min(1, 'Token do convite ausente') });
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const updateMemberRoleSchema = z.object({ role: memberRoleSchema });
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
