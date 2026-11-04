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

  async revokeRefreshToken(id: string) {
    await this.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  }

  /** Encerra todas as sessões do usuário (troca de senha, suspeita de roubo de token). */
  async revokeAllRefreshTokens(userId: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
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

  async markPasswordResetTokenUsed(id: string) {
    await this.db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }
}
