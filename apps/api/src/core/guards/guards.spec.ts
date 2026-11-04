import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError, NotFoundError, UnauthenticatedError, ValidationError } from '@/core/errors';
import type { Database } from '@/core/database/database.module';
import { RolesGuard } from './roles.guard';
import type { WorkspaceRequest } from './workspace-context';
import { WorkspaceMemberGuard } from './workspace-member.guard';

const WS = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

function ctx(req: Partial<WorkspaceRequest>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

/** Banco falso: devolve as linhas informadas para select().from().where().limit() */
function fakeDb(rows: unknown[]) {
  const chain = { select: () => chain, from: () => chain, where: () => chain, limit: async () => rows };
  return chain as unknown as Database;
}

describe('WorkspaceMemberGuard', () => {
  const user = { id: 'u1', email: 'a@b.com' };

  it('lê o workspace do header e guarda o papel em req.workspace', async () => {
    const req: Partial<WorkspaceRequest> = { user, params: {}, headers: { 'x-workspace-id': WS } };
    await expect(new WorkspaceMemberGuard(fakeDb([{ role: 'admin' }])).canActivate(ctx(req))).resolves.toBe(true);
    expect(req.workspace).toEqual({ id: WS, role: 'admin' });
  });

  it('prefere o :workspaceId da rota ao header', async () => {
    const other = '11111111-2222-4333-8444-555555555555';
    const req: Partial<WorkspaceRequest> = { user, params: { workspaceId: WS }, headers: { 'x-workspace-id': other } };
    await new WorkspaceMemberGuard(fakeDb([{ role: 'member' }])).canActivate(ctx(req));
    expect(req.workspace?.id).toBe(WS);
  });

  it('sem workspace → 422 pedindo o header', async () => {
    const req: Partial<WorkspaceRequest> = { user, params: {}, headers: {} };
    await expect(new WorkspaceMemberGuard(fakeDb([])).canActivate(ctx(req))).rejects.toThrow(/X-Workspace-Id/);
  });

  it('id que não é UUID → ValidationError (não chega no banco)', async () => {
    const req: Partial<WorkspaceRequest> = { user, params: {}, headers: { 'x-workspace-id': 'abc' } };
    await expect(new WorkspaceMemberGuard(fakeDb([])).canActivate(ctx(req))).rejects.toBeInstanceOf(ValidationError);
  });

  it('não é membro → NotFoundError (404, não revela que o workspace existe)', async () => {
    const req: Partial<WorkspaceRequest> = { user, params: {}, headers: { 'x-workspace-id': WS } };
    await expect(new WorkspaceMemberGuard(fakeDb([])).canActivate(ctx(req))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('sem usuário logado → UnauthenticatedError', async () => {
    const req: Partial<WorkspaceRequest> = { params: {}, headers: { 'x-workspace-id': WS } };
    await expect(new WorkspaceMemberGuard(fakeDb([])).canActivate(ctx(req))).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });
});

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector & { getAllAndOverride: jest.Mock };
  const guard = new RolesGuard(reflector);

  it('sem @Roles libera qualquer membro', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctx({ workspace: { id: WS, role: 'member' } }))).toBe(true);
  });

  it('@Roles("admin") libera admin', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(guard.canActivate(ctx({ workspace: { id: WS, role: 'admin' } }))).toBe(true);
  });

  it('@Roles("admin") bloqueia membro comum com ForbiddenError', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() => guard.canActivate(ctx({ workspace: { id: WS, role: 'member' } }))).toThrow(ForbiddenError);
  });

  it('acusa erro de programação se faltar o WorkspaceMemberGuard antes', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(() => guard.canActivate(ctx({}))).toThrow(/WorkspaceMemberGuard/);
  });
});
