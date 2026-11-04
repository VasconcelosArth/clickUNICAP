import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '@/core/config';
import { UnauthenticatedError } from '@/core/errors';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './decorators';

const secret = 'segredo-de-teste-123456';
const config = { jwt: { accessSecret: secret } } as AppConfig;
const jwt = new JwtService();

function context(req: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector & { getAllAndOverride: jest.Mock };
  const guard = new JwtAuthGuard(reflector, jwt, config);

  beforeEach(() => reflector.getAllAndOverride.mockReturnValue(false));

  it('libera rotas @Public() sem token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(context({ headers: {} }))).resolves.toBe(true);
  });

  it('bloqueia sem token', async () => {
    await expect(guard.canActivate(context({ headers: {}, cookies: {} }))).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('aceita token válido no cookie e preenche req.user', async () => {
    const token = await jwt.signAsync({ sub: 'u1', email: 'a@b.com' }, { secret });
    const req: Partial<AuthenticatedRequest> = { headers: {}, cookies: { access_token: token } };
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('aceita token no header Authorization: Bearer', async () => {
    const token = await jwt.signAsync({ sub: 'u1', email: 'a@b.com' }, { secret });
    await expect(guard.canActivate(context({ headers: { authorization: `Bearer ${token}` } }))).resolves.toBe(true);
  });

  it('rejeita token assinado com outro segredo', async () => {
    const token = await jwt.signAsync({ sub: 'u1', email: 'a@b.com' }, { secret: 'outro-segredo-qualquer' });
    await expect(guard.canActivate(context({ headers: {}, cookies: { access_token: token } }))).rejects.toThrow(
      /Sessão expirada/,
    );
  });

  it('rejeita token expirado', async () => {
    const token = await jwt.signAsync({ sub: 'u1', email: 'a@b.com' }, { secret, expiresIn: -10 });
    await expect(guard.canActivate(context({ headers: {}, cookies: { access_token: token } }))).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });
});
