import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '@/core/config';
import { ConflictError, DomainError, UnauthenticatedError } from '@/core/errors';
import { MailService } from '@/core/mail/mail.service';
import type { UserRow } from '@/modules/users/users.repository';
import { UsersService } from '@/modules/users/users.service';
import { AuthRepository, type PasswordResetTokenRow, type RefreshTokenRow } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher';
import { hashToken } from '@/core/auth/opaque-token';

const userRow: UserRow = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@teste.com',
  passwordHash: 'HASH(certa)',
  avatarUrl: null,
  createdAt: new Date('2026-11-04T12:00:00Z'),
  updatedAt: new Date('2026-11-04T12:00:00Z'),
};
const userDto = { id: 'u1', name: 'Ana', email: 'ana@teste.com', avatarUrl: null, createdAt: '2026-11-04T12:00:00.000Z' };
const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 60_000);

describe('AuthService', () => {
  const users = { findByEmailWithPassword: jest.fn(), create: jest.fn(), getProfile: jest.fn(), setPasswordHash: jest.fn() };
  const repo = {
    insertRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllRefreshTokens: jest.fn(),
    insertPasswordResetToken: jest.fn(),
    findPasswordResetToken: jest.fn(),
    markPasswordResetTokenUsed: jest.fn(),
  };
  // Hasher falso e rápido: HASH(senha)
  const hasher = {
    hash: jest.fn(async (p: string) => `HASH(${p})`),
    verify: jest.fn(async (h: string, p: string) => h === `HASH(${p})`),
  };
  const mail = { send: jest.fn() };
  const config = {
    webUrl: 'http://localhost:5173',
    jwt: { accessSecret: 'access-secret-0123456789', refreshSecret: 'r', accessTtl: '15m', refreshTtl: '7d' },
  } as AppConfig;
  const jwt = new JwtService();
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: AuthRepository, useValue: repo },
        { provide: PasswordHasher, useValue: hasher },
        { provide: JwtService, useValue: jwt },
        { provide: AppConfig, useValue: config },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = mod.get(AuthService);
  });

  describe('register', () => {
    it('cria o usuário com a senha em hash e abre uma sessão', async () => {
      users.findByEmailWithPassword.mockResolvedValue(undefined);
      users.create.mockResolvedValue(userRow);

      const session = await service.register({ name: 'Ana', email: 'ana@teste.com', password: 'senha123' });

      expect(users.create).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@teste.com', passwordHash: 'HASH(senha123)' });
      expect(session.user).toEqual(userDto);
      expect(session.user).not.toHaveProperty('passwordHash');
    });

    it('lança ConflictError EMAIL_TAKEN se o e-mail já existe', async () => {
      users.findByEmailWithPassword.mockResolvedValue(userRow);
      await expect(service.register({ name: 'X', email: 'ana@teste.com', password: 'senha123' })).rejects.toMatchObject({
        code: 'EMAIL_TAKEN',
      });
      await expect(service.register({ name: 'X', email: 'ana@teste.com', password: 'senha123' })).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('emite access token JWT com sub e email, e guarda só o HASH do refresh token', async () => {
      users.findByEmailWithPassword.mockResolvedValue(userRow);
      const session = await service.login({ email: 'ana@teste.com', password: 'certa' });

      const payload = await jwt.verifyAsync(session.accessToken, { secret: config.jwt.accessSecret });
      expect(payload).toMatchObject({ sub: 'u1', email: 'ana@teste.com' });

      const saved = repo.insertRefreshToken.mock.calls[0][0];
      expect(saved.tokenHash).toBe(hashToken(session.refreshToken));
      expect(saved.tokenHash).not.toBe(session.refreshToken);
    });

    it('refresh expira em 7 dias e access em 15 minutos (valores do .env)', async () => {
      users.findByEmailWithPassword.mockResolvedValue(userRow);
      const before = Date.now();
      const session = await service.login({ email: 'ana@teste.com', password: 'certa' });
      expect(session.refreshExpiresAt.getTime() - before).toBeGreaterThanOrEqual(7 * 86_400_000 - 1000);
      expect(session.accessExpiresAt.getTime() - before).toBeLessThanOrEqual(15 * 60_000 + 1000);
    });

    it('senha errada e e-mail inexistente dão a MESMA mensagem genérica', async () => {
      users.findByEmailWithPassword.mockResolvedValueOnce(userRow);
      const wrongPassword = service.login({ email: 'ana@teste.com', password: 'errada' });
      await expect(wrongPassword).rejects.toThrow('E-mail ou senha inválidos');

      users.findByEmailWithPassword.mockResolvedValueOnce(undefined);
      const noUser = service.login({ email: 'ninguem@teste.com', password: 'x' });
      await expect(noUser).rejects.toThrow('E-mail ou senha inválidos');
      expect(repo.insertRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const stored = (over: Partial<RefreshTokenRow> = {}): RefreshTokenRow => ({
      id: 'rt1',
      userId: 'u1',
      tokenHash: hashToken('raw'),
      expiresAt: future(),
      revokedAt: null,
      createdAt: new Date(),
      ...over,
    });

    it('rotaciona: revoga o token usado e emite um novo', async () => {
      repo.findRefreshToken.mockResolvedValue(stored());
      users.getProfile.mockResolvedValue(userDto);

      const session = await service.refresh('raw');

      expect(repo.findRefreshToken).toHaveBeenCalledWith(hashToken('raw'));
      expect(repo.revokeRefreshToken).toHaveBeenCalledWith('rt1');
      expect(repo.insertRefreshToken).toHaveBeenCalledTimes(1);
      expect(session.refreshToken).not.toBe('raw');
    });

    it('sem cookie → UnauthenticatedError', async () => {
      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('token desconhecido → UnauthenticatedError', async () => {
      repo.findRefreshToken.mockResolvedValue(undefined);
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(UnauthenticatedError);
    });

    it('token expirado → UnauthenticatedError, sem emitir sessão', async () => {
      repo.findRefreshToken.mockResolvedValue(stored({ expiresAt: past() }));
      await expect(service.refresh('raw')).rejects.toThrow(/expirada/);
      expect(repo.insertRefreshToken).not.toHaveBeenCalled();
    });

    it('REUSO de token revogado encerra TODAS as sessões do usuário', async () => {
      repo.findRefreshToken.mockResolvedValue(stored({ revokedAt: past() }));
      await expect(service.refresh('raw')).rejects.toThrow(/segurança/);
      expect(repo.revokeAllRefreshTokens).toHaveBeenCalledWith('u1');
      expect(repo.insertRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revoga o refresh token ativo', async () => {
      repo.findRefreshToken.mockResolvedValue({ id: 'rt1', revokedAt: null });
      await service.logout('raw');
      expect(repo.revokeRefreshToken).toHaveBeenCalledWith('rt1');
    });

    it('é idempotente: sem cookie ou token já revogado não faz nada', async () => {
      await service.logout(undefined);
      repo.findRefreshToken.mockResolvedValue({ id: 'rt1', revokedAt: past() });
      await service.logout('raw');
      expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('envia e-mail com link contendo o token bruto e guarda só o hash', async () => {
      users.findByEmailWithPassword.mockResolvedValue(userRow);
      await service.forgotPassword({ email: 'ana@teste.com' });

      const { text, html, to } = mail.send.mock.calls[0][0];
      expect(to).toBe('ana@teste.com');
      expect(text).toContain('http://localhost:5173/reset-password?token=');
      expect(html).toContain('Criar nova senha');
      const raw = /token=([A-Za-z0-9_-]+)/.exec(text)?.[1];
      expect(raw).toBeDefined();
      expect(repo.insertPasswordResetToken.mock.calls[0][0].tokenHash).toBe(hashToken(raw!));
    });

    it('o token expira em 1 hora', async () => {
      users.findByEmailWithPassword.mockResolvedValue(userRow);
      const before = Date.now();
      await service.forgotPassword({ email: 'ana@teste.com' });
      const { expiresAt } = repo.insertPasswordResetToken.mock.calls[0][0];
      expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(3_600_000 - 1000);
      expect(expiresAt.getTime() - before).toBeLessThanOrEqual(3_600_000 + 1000);
    });

    it('se o Resend falhar, NÃO lança erro (não revela que o e-mail existe)', async () => {
      users.findByEmailWithPassword.mockResolvedValue(userRow);
      mail.send.mockRejectedValueOnce(new Error('Resend respondeu 500'));
      await expect(service.forgotPassword({ email: 'ana@teste.com' })).resolves.toBeUndefined();
    });

    it('e-mail inexistente: não envia nada e não lança erro', async () => {
      users.findByEmailWithPassword.mockResolvedValue(undefined);
      await expect(service.forgotPassword({ email: 'x@y.com' })).resolves.toBeUndefined();
      expect(mail.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const resetRow = (over: Partial<PasswordResetTokenRow> = {}): PasswordResetTokenRow => ({
      id: 'pr1',
      userId: 'u1',
      tokenHash: hashToken('tok'),
      expiresAt: future(),
      usedAt: null,
      createdAt: new Date(),
      ...over,
    });

    it('troca a senha, marca o token como usado e derruba as sessões', async () => {
      repo.findPasswordResetToken.mockResolvedValue(resetRow());
      await service.resetPassword({ token: 'tok', password: 'nova-senha' });
      expect(users.setPasswordHash).toHaveBeenCalledWith('u1', 'HASH(nova-senha)');
      expect(repo.markPasswordResetTokenUsed).toHaveBeenCalledWith('pr1');
      expect(repo.revokeAllRefreshTokens).toHaveBeenCalledWith('u1');
    });

    it.each([
      ['inexistente', undefined],
      ['já usado', resetRow({ usedAt: past() })],
      ['expirado', resetRow({ expiresAt: past() })],
    ])('token %s → INVALID_RESET_TOKEN', async (_, row) => {
      repo.findPasswordResetToken.mockResolvedValue(row);
      const result = service.resetPassword({ token: 'tok', password: 'nova-senha' });
      await expect(result).rejects.toBeInstanceOf(DomainError);
      await expect(service.resetPassword({ token: 'tok', password: 'nova-senha' })).rejects.toMatchObject({
        code: 'INVALID_RESET_TOKEN',
      });
      expect(users.setPasswordHash).not.toHaveBeenCalled();
    });
  });
});
