import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { passwordResetTokens, refreshTokens } from '@/core/database/schema';

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;

/** Tokens de sessão e de recuperação de senha. Só guarda HASHES, nunca o token bruto. */
@Injectable()
export class AuthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ---------- refresh tokens ----------

  async insertRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    await this.db.insert(refreshTokens).values(data);
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | undefined> {
    const [row] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
    return row;
  }

  /**
   * Marca o token como trocado na rotação (`revoked_at` só significa isso; sessões encerradas têm a linha apagada).
   * Atômico: em chamadas simultâneas, apenas uma recebe true.
   */
  async revokeRefreshToken(id: string): Promise<boolean> {
    const rows = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    return rows.length > 0;
  }

  /** Encerra uma sessão (logout). */
  async deleteRefreshToken(id: string) {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, id));
  }

  /** Encerra todas as sessões do usuário (troca de senha, suspeita de roubo de token). */
  async deleteAllRefreshTokens(userId: string) {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  // ---------- recuperação de senha ----------

  async insertPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    await this.db.insert(passwordResetTokens).values(data);
  }

  async findPasswordResetToken(tokenHash: string): Promise<PasswordResetTokenRow | undefined> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);
    return row;
  }

  /** Atômico: invalida todos os links pendentes do usuário e devolve os ids que este comando consumiu. */
  async consumePasswordResetTokens(userId: string): Promise<string[]> {
    const rows = await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });
    return rows.map((r) => r.id);
  }
}
