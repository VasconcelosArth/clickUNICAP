import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, lt, or, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { notifications } from '@/core/database/schema';

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;

/** Dono da caixa de entrada: toda query filtra pelo usuário E pelo workspace. */
export interface Inbox {
  userId: string;
  workspaceId: string;
}

/** SQL das notificações. Sem regra de negócio. */
@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async insert(data: NewNotificationRow): Promise<NotificationRow> {
    const [row] = await this.db.insert(notifications).values(data).returning();
    if (!row) throw new Error('Falha ao criar notificação');
    return row;
  }

  /**
   * As mais novas primeiro. A paginação usa a notificação `cursor` como ponto de partida:
   * devolve as que vêm depois dela na ordem (created_at desc, id desc). Busca `limit + 1` para saber se há mais.
   */
  async list(inbox: Inbox, opts: { unread: boolean; limit: number; cursor?: NotificationRow }) {
    const filters: (SQL | undefined)[] = [this.scope(inbox)];
    if (opts.unread) filters.push(isNull(notifications.readAt));
    if (opts.cursor) {
      filters.push(
        or(
          lt(notifications.createdAt, opts.cursor.createdAt),
          and(eq(notifications.createdAt, opts.cursor.createdAt), lt(notifications.id, opts.cursor.id)),
        ),
      );
    }
    return this.db
      .select()
      .from(notifications)
      .where(and(...filters))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(opts.limit + 1);
  }

  async findById(inbox: Inbox, id: string): Promise<NotificationRow | undefined> {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), this.scope(inbox)))
      .limit(1);
    return row;
  }

  async countUnread(inbox: Inbox): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(this.scope(inbox), isNull(notifications.readAt)));
    return row?.value ?? 0;
  }

  /** Marca como lida. Se já estava lida, mantém a data original. */
  async markRead(inbox: Inbox, id: string): Promise<NotificationRow | undefined> {
    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), this.scope(inbox), isNull(notifications.readAt)))
      .returning();
    return updated ?? this.findById(inbox, id);
  }

  async markAllRead(inbox: Inbox): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(this.scope(inbox), isNull(notifications.readAt)));
  }

  private scope(inbox: Inbox): SQL | undefined {
    return and(eq(notifications.userId, inbox.userId), eq(notifications.workspaceId, inbox.workspaceId));
  }
}
