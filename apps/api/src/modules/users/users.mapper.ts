import type { User } from '@clickunicap/shared';
import type { UserRow } from './users.repository';

/** Linha do banco → resposta da API. NUNCA expõe password_hash. */
export function toUserDto(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
  };
}
