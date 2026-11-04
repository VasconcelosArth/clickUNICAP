import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole } from '@clickunicap/shared';
import { ForbiddenError } from '@/core/errors';
import { ROLES_KEY, type WorkspaceRequest } from './workspace-context';

/**
 * Confere o papel do usuário no workspace (preenchido pelo WorkspaceMemberGuard, que precisa vir ANTES).
 * Sem @Roles() na rota, libera qualquer membro.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<MemberRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const ws = ctx.switchToHttp().getRequest<WorkspaceRequest>().workspace;
    if (!ws) throw new ForbiddenError('Workspace não resolvido. Use @UseGuards(WorkspaceMemberGuard, RolesGuard).');
    if (!required.includes(ws.role)) throw new ForbiddenError('Só administradores do workspace podem fazer isso');
    return true;
  }
}
