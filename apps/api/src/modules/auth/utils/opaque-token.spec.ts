import { generateOpaqueToken, hashToken } from './opaque-token';

describe('opaque token', () => {
  it('gera tokens diferentes a cada chamada', () => {
    expect(generateOpaqueToken().raw).not.toBe(generateOpaqueToken().raw);
  });

  it('o hash guardado corresponde ao token bruto', () => {
    const { raw, hash } = generateOpaqueToken();
    expect(hashToken(raw)).toBe(hash);
    expect(hash).not.toBe(raw);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('o token é seguro para URL (base64url, 64 caracteres)', () => {
    expect(generateOpaqueToken().raw).toMatch(/^[A-Za-z0-9_-]{64}$/);
  });
});
