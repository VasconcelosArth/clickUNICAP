import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput, User } from '@clickunicap/shared';
import { type AccessTokenPayload, parseDuration } from '@/core/auth';
import { AppConfig } from '@/core/config';
import { ConflictError, DomainError, UnauthenticatedError } from '@/core/errors';
import { MailService } from '@/core/mail/mail.service';
import { passwordResetEmail } from '@/core/mail/templates/password-reset.template';
import { toUserDto } from '@/modules/users/users.mapper';
import type { UserRow } from '@/modules/users/users.repository';
import { UsersService } from '@/modules/users/users.service';
import { AuthRepository } from './auth.repository';
import { PasswordHasher } from './password-hasher';
import { generateOpaqueToken, hashToken } from '@/core/auth/opaque-token';

/** O que o controller precisa para responder e montar os cookies. */
export interface Session {
  user: User;
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hora
/** Duas abas podem renovar a sessão quase juntas: nesse intervalo, reusar o token não é tratado como roubo. */
export const REFRESH_REUSE_GRACE_MS = 10_000;
const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';
const INVALID_RESET_TOKEN = 'Link de recuperação inválido ou expirado';

const refreshInProgress = () =>
  new ConflictError('A sessão acabou de ser renovada. Tente novamente.', 'REFRESH_IN_PROGRESS');

/**
 * Regras de autenticação:
 * - access token JWT curto (JWT_ACCESS_TTL) + refresh token opaco longo (JWT_REFRESH_TTL), salvo como hash;
 * - ROTAÇÃO: cada refresh revoga o token usado e emite um novo;
 * - REUSO de um refresh já revogado = possível roubo → todas as sessões do usuário são encerradas;
 * - exceção: até REFRESH_REUSE_GRACE_MS depois da revogação, o reuso recebe 409 REFRESH_IN_PROGRESS (várias abas);
 * - login e "esqueci a senha" nunca revelam se o e-mail existe.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly users: UsersService,
    private readonly repo: AuthRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly mail: MailService,
  ) {}

  async register(input: RegisterInput): Promise<Session> {
    if (await this.users.findByEmailWithPassword(input.email)) {
      throw new ConflictError('Já existe uma conta com este e-mail', 'EMAIL_TAKEN');
    }
    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash: await this.hasher.hash(input.password),
    });
    return this.issueSession(user);
  }

  async login(input: LoginInput): Promise<Session> {
    const user = await this.users.findByEmailWithPassword(input.email);
    if (!user || !(await this.hasher.verify(user.passwordHash, input.password))) {
      throw new UnauthenticatedError(INVALID_CREDENTIALS);
    }
    return this.issueSession(user);
  }

  async refresh(rawRefreshToken: string | undefined): Promise<Session> {
    if (!rawRefreshToken) throw new UnauthenticatedError();
    const stored = await this.repo.findRefreshToken(hashToken(rawRefreshToken));
    if (!stored) throw new UnauthenticatedError('Sessão inválida. Faça login novamente.');

    if (stored.revokedAt) {
      if (Date.now() - stored.revokedAt.getTime() < REFRESH_REUSE_GRACE_MS) throw refreshInProgress();
      await this.repo.deleteAllRefreshTokens(stored.userId);
      throw new UnauthenticatedError('Sessão encerrada por segurança. Faça login novamente.');
    }
    if (stored.expiresAt <= new Date()) throw new UnauthenticatedError('Sessão expirada. Faça login novamente.');

    const user = await this.users.getProfile(stored.userId).catch(() => {
      throw new UnauthenticatedError();
    });
    if (!(await this.repo.revokeRefreshToken(stored.id))) throw refreshInProgress();
    return this.issueSessionForDto(user);
  }

  /** Encerra a sessão atual. Idempotente: chamar sem sessão não é erro. */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const stored = await this.repo.findRefreshToken(hashToken(rawRefreshToken));
    if (stored && !stored.revokedAt) await this.repo.deleteRefreshToken(stored.id);
  }

  /** Sempre "dá certo" para quem chama, exista ou não o e-mail (evita descobrir contas). */
  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.users.findByEmailWithPassword(input.email);
    if (!user) return;

    const { raw, hash } = generateOpaqueToken();
    await this.repo.insertPasswordResetToken({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });
    const link = `${this.config.webUrl}/reset-password?token=${encodeURIComponent(raw)}`;
    const email = passwordResetEmail({
      to: user.email,
      name: user.name,
      link,
      validMinutes: PASSWORD_RESET_TTL_MS / 60_000,
    });

    // Se o provedor de e-mail falhar, registramos o erro mas respondemos igual:
    // um 500 aqui revelaria que o e-mail existe.
    try {
      await this.mail.send(email);
    } catch (e) {
      this.logger.error(`Falha ao enviar e-mail de recuperação para o usuário ${user.id}: ${String(e)}`);
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const stored = await this.repo.findPasswordResetToken(hashToken(input.token));
    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
      throw new DomainError(INVALID_RESET_TOKEN, 'INVALID_RESET_TOKEN', 400);
    }
    const passwordHash = await this.hasher.hash(input.password);
    // Consome este link e os outros pendentes do usuário antes de trocar a senha: só um pedido simultâneo passa.
    const consumed = await this.repo.consumePasswordResetTokens(stored.userId);
    if (!consumed.includes(stored.id)) throw new DomainError(INVALID_RESET_TOKEN, 'INVALID_RESET_TOKEN', 400);

    await this.users.setPasswordHash(stored.userId, passwordHash);
    await this.repo.deleteAllRefreshTokens(stored.userId); // derruba sessões antigas
  }

  // ---------- internos ----------

  private issueSession(row: UserRow): Promise<Session> {
    return this.issueSessionForDto(toUserDto(row));
  }

  private async issueSessionForDto(user: User): Promise<Session> {
    const { accessTtl, refreshTtl, accessSecret } = this.config.jwt;
    const accessMs = parseDuration(accessTtl);
    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: accessSecret,
      expiresIn: Math.floor(accessMs / 1000),
    });

    const { raw, hash } = generateOpaqueToken();
    const refreshExpiresAt = new Date(Date.now() + parseDuration(refreshTtl));
    await this.repo.insertRefreshToken({ userId: user.id, tokenHash: hash, expiresAt: refreshExpiresAt });

    return { user, accessToken, accessExpiresAt: new Date(Date.now() + accessMs), refreshToken: raw, refreshExpiresAt };
  }
}
