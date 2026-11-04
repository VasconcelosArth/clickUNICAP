import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import { UnauthenticatedError } from '@/core/errors';
import { IS_PUBLIC_KEY } from './auth.constants';

/** Usuário autenticado, extraído do access token pelo JwtAuthGuard. */
export interface AuthUser {
  id: string;
  email: string;
}

/** Requisição depois de passar pelo JwtAuthGuard. */
export type AuthenticatedRequest = Request & { user?: AuthUser };

/**
 * Libera a rota do login obrigatório. Use só em rotas realmente abertas
 * (cadastro, login, refresh, recuperar senha, health).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Injeta o usuário logado: `@CurrentUser() user: AuthUser`. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new UnauthenticatedError();
  return user;
});
