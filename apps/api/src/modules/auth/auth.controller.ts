import { Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sessionResponseSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@clickunicap/shared';
import { ACCESS_COOKIE, ACCESS_COOKIE_PATH, Public, REFRESH_COOKIE, REFRESH_COOKIE_PATH } from '@/core/auth';
import { AppConfig } from '@/core/config';
import { ConflictError } from '@/core/errors';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { AuthService, type Session } from './auth.service';

/**
 * Rotas de autenticação. Os tokens vão SÓ em cookies httpOnly (o frontend não lê nem guarda tokens).
 * O corpo da resposta traz apenas o usuário.
 */
@Public()
@UseGuards(ThrottlerGuard) // limite padrão: 20 req/min por IP (core/auth/core-auth.module.ts)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  /** POST /api/auth/register → 201 { user } + cookies */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ZodResponse(sessionResponseSchema, 201)
  async register(@ZodBody(registerSchema) body: RegisterInput, @Res({ passthrough: true }) res: Response) {
    return this.respondWithSession(res, await this.auth.register(body));
  }

  /** POST /api/auth/login → 200 { user } + cookies */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // contra força bruta de senha
  @HttpCode(200)
  @ZodResponse(sessionResponseSchema)
  async login(@ZodBody(loginSchema) body: LoginInput, @Res({ passthrough: true }) res: Response) {
    return this.respondWithSession(res, await this.auth.login(body));
  }

  /** POST /api/auth/refresh → 200 { user } + cookies novos (o refresh antigo é revogado) */
  @Post('refresh')
  @HttpCode(200)
  @ZodResponse(sessionResponseSchema)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respondWithSession(res, await this.auth.refresh(readCookie(req, REFRESH_COOKIE)));
    } catch (e) {
      // No 409 outra aba acabou de renovar: apagar os cookies derrubaria a sessão nova.
      if (!(e instanceof ConflictError)) this.clearCookies(res);
      throw e;
    }
  }

  /** POST /api/auth/logout → 204, revoga a sessão e apaga os cookies */
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(readCookie(req, REFRESH_COOKIE));
    this.clearCookies(res);
  }

  /** POST /api/auth/forgot-password → 204 sempre (não revela se o e-mail existe) */
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // evita spam de e-mails
  @HttpCode(204)
  async forgotPassword(@ZodBody(forgotPasswordSchema) body: ForgotPasswordInput) {
    await this.auth.forgotPassword(body);
  }

  /** POST /api/auth/reset-password → 204 */
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(204)
  async resetPassword(@ZodBody(resetPasswordSchema) body: ResetPasswordInput) {
    await this.auth.resetPassword(body);
  }

  // ---------- cookies ----------

  private baseCookie(): CookieOptions {
    return { httpOnly: true, secure: this.config.isProduction, sameSite: 'lax' };
  }

  private respondWithSession(res: Response, session: Session) {
    res.cookie(ACCESS_COOKIE, session.accessToken, {
      ...this.baseCookie(),
      path: ACCESS_COOKIE_PATH,
      expires: session.accessExpiresAt,
    });
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.baseCookie(),
      path: REFRESH_COOKIE_PATH,
      expires: session.refreshExpiresAt,
    });
    return { user: session.user };
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { ...this.baseCookie(), path: ACCESS_COOKIE_PATH });
    res.clearCookie(REFRESH_COOKIE, { ...this.baseCookie(), path: REFRESH_COOKIE_PATH });
  }
}

function readCookie(req: Request, name: string): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[name];
}
