import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { users } from '@/core/database/schema';

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

/**
 * Acesso à tabela users. Exceção à regra de escopo por workspace: um usuário existe
 * fora dos workspaces (ele pode estar em vários). Quem chama decide o que pode ver.
 */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }

  /** O e-mail é citext: a busca já ignora maiúsculas/minúsculas no banco. */
  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row;
  }

  async insert(data: NewUserRow): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(data).returning();
    if (!row) throw new Error('Falha ao inserir usuário');
    return row;
  }

  async update(id: string, data: Partial<Pick<NewUserRow, 'name' | 'avatarUrl' | 'passwordHash'>>) {
    const [row] = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return row;
  }
}
