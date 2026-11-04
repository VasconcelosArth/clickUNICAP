import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '@/core/config';
import { UnauthenticatedError } from '@/core/errors';
import { ACCESS_COOKIE, IS_PUBLIC_KEY } from './auth.constants';
import type { AuthenticatedRequest } from './decorators';

/** Conteúdo do access token. `sub` = id do usuário (padrão JWT). */
export interface AccessTokenPayload {
  sub: string;
  email: string;
}

/**
 * Guard GLOBAL: toda rota exige login, exceto as marcadas com @Public().
 * Lê o token do cookie httpOnly `access_token` (navegador) ou do header
 * `Authorization: Bearer` (Swagger e ferramentas como Insomnia).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractToken(req);
    if (!token) throw new UnauthenticatedError();

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, { secret: this.config.jwt.accessSecret });
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthenticatedError('Sessão expirada. Faça login novamente.');
    }
  }
}

function extractToken(req: AuthenticatedRequest): string | undefined {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
  if (fromCookie) return fromCookie;
  const [scheme, value] = req.headers.authorization?.split(' ') ?? [];
  return scheme === 'Bearer' && value ? value : undefined;
}
