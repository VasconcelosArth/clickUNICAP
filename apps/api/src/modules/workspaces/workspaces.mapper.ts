import type { MemberRole, MemberWithUser, MyWorkspace, Workspace, WorkspaceInvite } from '@clickunicap/shared';
import type { InviteRow, MemberRow, WorkspaceRow } from './workspaces.repository';

export function toWorkspaceDto(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toMyWorkspaceDto(row: WorkspaceRow & { myRole: MemberRole }): MyWorkspace {
  return { ...toWorkspaceDto(row), myRole: row.myRole };
}

export function toMemberDto(row: MemberRow, ownerId: string): MemberWithUser {
  return {
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    isOwner: row.userId === ownerId,
  };
}

/** Nunca expõe o token_hash. */
export function toInviteDto(row: InviteRow): WorkspaceInvite {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    email: row.email,
    role: row.role,
    invitedBy: row.invitedBy,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
