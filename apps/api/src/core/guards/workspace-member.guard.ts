import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { idSchema } from '@clickunicap/shared';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { workspaceMembers } from '@/core/database/schema';
import { NotFoundError, UnauthenticatedError, ValidationError } from '@/core/errors';
import { WORKSPACE_HEADER, type WorkspaceRequest } from './workspace-context';

/**
 * Garante que o usuário logado é MEMBRO do workspace da requisição e guarda { id, role } em req.workspace.
 *
 * De onde vem o workspace (nesta ordem):
 *  1. parâmetro de rota `:workspaceId`  (ex.: /api/workspaces/:workspaceId/members)
 *  2. header `X-Workspace-Id`           (ex.: /api/projects, /api/tasks/:id — o frontend envia sempre)
 *
 * Não é membro → 404 (e não 403), para não revelar que o workspace existe.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<WorkspaceRequest>();
    if (!req.user) throw new UnauthenticatedError();

    const fromParam = (req.params as Record<string, string | undefined>)?.workspaceId;
    const fromHeader = req.headers[WORKSPACE_HEADER];
    const raw = fromParam ?? (Array.isArray(fromHeader) ? fromHeader[0] : fromHeader);

    if (!raw) throw new ValidationError('Informe o workspace no header X-Workspace-Id');
    const parsed = idSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError('X-Workspace-Id precisa ser um UUID');

    const [member] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, parsed.data), eq(workspaceMembers.userId, req.user.id)))
      .limit(1);

    if (!member) throw new NotFoundError('Workspace', parsed.data);
    req.workspace = { id: parsed.data, role: member.role };
    return true;
  }
}
