import { createHash, randomBytes } from 'node:crypto';

/**
 * Tokens opacos (refresh, recuperação de senha, convite): um valor aleatório que vai para o cliente
 * e um hash SHA-256 que vai para o banco. Se o banco vazar, os tokens não podem ser usados.
 */
export function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
