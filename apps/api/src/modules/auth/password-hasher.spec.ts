import { PasswordHasher } from './password-hasher';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('gera hash argon2id e confere a senha certa', async () => {
    const hash = await hasher.hash('senha-forte-123');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(hasher.verify(hash, 'senha-forte-123')).resolves.toBe(true);
  });

  it('recusa a senha errada', async () => {
    const hash = await hasher.hash('senha-forte-123');
    await expect(hasher.verify(hash, 'senha-errada')).resolves.toBe(false);
  });

  it('devolve false (sem lançar) para hash inválido', async () => {
    await expect(hasher.verify('nao-e-um-hash', 'x')).resolves.toBe(false);
  });
});
