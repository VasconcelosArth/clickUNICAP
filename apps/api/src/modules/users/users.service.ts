import { Injectable } from '@nestjs/common';
import type { UpdateProfileInput, User } from '@clickunicap/shared';
import { NotFoundError } from '@/core/errors';
import { toUserDto } from './users.mapper';
import { type NewUserRow, type UserRow, UsersRepository } from './users.repository';

/**
 * Regras de usuário. É EXPORTADO pelo UsersModule: outros módulos (auth, workspaces)
 * usam este service — nunca o UsersRepository diretamente.
 */
@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getProfile(userId: string): Promise<User> {
    const row = await this.repo.findById(userId);
    if (!row) throw new NotFoundError('User', userId);
    return toUserDto(row);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    if (Object.keys(input).length === 0) return this.getProfile(userId);
    const row = await this.repo.update(userId, input);
    if (!row) throw new NotFoundError('User', userId);
    return toUserDto(row);
  }

  // ---- Usado pelo módulo auth (devolve a linha completa, com o hash da senha) ----

  findByEmailWithPassword(email: string): Promise<UserRow | undefined> {
    return this.repo.findByEmail(email);
  }

  create(data: Pick<NewUserRow, 'name' | 'email' | 'passwordHash'>): Promise<UserRow> {
    return this.repo.insert(data);
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    const row = await this.repo.update(userId, { passwordHash });
    if (!row) throw new NotFoundError('User', userId);
  }
}
