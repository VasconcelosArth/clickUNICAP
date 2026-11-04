import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { MemberRole } from '@clickunicap/shared';
import type { AuthenticatedRequest } from '@/core/auth';
import { ForbiddenError } from '@/core/errors';

/** Workspace da requisição, preenchido pelo WorkspaceMemberGuard. */
export interface WorkspaceContext {
  id: string;
  role: MemberRole;
}

export type WorkspaceRequest = AuthenticatedRequest & { workspace?: WorkspaceContext };

/** Header que o frontend envia em toda requisição com o workspace ativo. */
export const WORKSPACE_HEADER = 'x-workspace-id';
export const ROLES_KEY = 'workspace:roles';

/**
 * Restringe a rota a papéis do workspace. Use junto com os guards:
 * @UseGuards(WorkspaceMemberGuard, RolesGuard) @Roles('admin')
 */
export const Roles = (...roles: MemberRole[]) => SetMetadata(ROLES_KEY, roles);

function getWorkspace(ctx: ExecutionContext): WorkspaceContext {
  const ws = ctx.switchToHttp().getRequest<WorkspaceRequest>().workspace;
  // Só acontece se alguém esquecer o @UseGuards(WorkspaceMemberGuard) na rota: é bug, não erro do usuário.
  if (!ws) throw new ForbiddenError('Workspace não resolvido. Faltou o WorkspaceMemberGuard nesta rota.');
  return ws;
}

/** Id do workspace ativo: `@CurrentWorkspace() workspaceId: string` */
export const CurrentWorkspace = createParamDecorator((_: unknown, ctx: ExecutionContext) => getWorkspace(ctx).id);

/** Workspace com o papel do usuário: `@CurrentMembership() m: WorkspaceContext` */
export const CurrentMembership = createParamDecorator((_: unknown, ctx: ExecutionContext) => getWorkspace(ctx));
