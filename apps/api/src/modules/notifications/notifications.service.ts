import { Injectable } from '@nestjs/common';
import type {
  ListNotificationsQuery,
  Notification,
  NotificationPage,
  NotificationPayload,
  NotificationType,
} from '@clickunicap/shared';
import { NotFoundError } from '@/core/errors';
import { TasksService } from '@/modules/tasks/tasks.service';
import { UsersService } from '@/modules/users/users.service';
import { type Inbox, type NotificationRow, NotificationsRepository } from './notifications.repository';

export function toNotificationDto(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    refId: row.refId,
    payload: row.payload as NotificationPayload,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** O que aconteceu, vindo de um evento de domínio. */
export interface NotifyInput {
  type: NotificationType;
  /** Quem recebe. */
  userId: string;
  workspaceId: string;
  taskId: string;
  /** Quem causou. Ausente em avisos automáticos (prazo chegando). */
  actorId?: string;
  /** Só em menções. */
  commentId?: string;
}

/**
 * Caixa de entrada do usuário. Cada usuário só vê as próprias notificações, e só as do workspace ativo:
 * a de outro usuário ou de outro workspace responde 404, como se não existisse.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly tasks: TasksService,
    private readonly users: UsersService,
  ) {}

  /**
   * Cria a notificação a partir de um evento. Devolve null quando não há o que avisar:
   * a pessoa agiu sobre si mesma, ou a tarefa já não existe neste workspace.
   */
  async notify(input: NotifyInput): Promise<Notification | null> {
    if (input.actorId && input.actorId === input.userId) return null;

    const task = await this.tasks.findOne(input.workspaceId, input.taskId);
    if (!task) return null;
    const actor = input.actorId ? await this.users.getProfile(input.actorId) : null;

    const payload: NotificationPayload = {
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      ...(input.commentId ? { commentId: input.commentId } : {}),
    };
    const row = await this.repo.insert({
      userId: input.userId,
      workspaceId: input.workspaceId,
      type: input.type,
      refId: input.commentId ?? task.id,
      payload,
    });
    return toNotificationDto(row);
  }

  async list(inbox: Inbox, query: ListNotificationsQuery): Promise<NotificationPage> {
    const cursor = query.cursor ? await this.mustFind(inbox, query.cursor) : undefined;
    const rows = await this.repo.list(inbox, { unread: query.unread, limit: query.limit, cursor });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      data: page.map(toNotificationDto),
      nextCursor: rows.length > query.limit && last ? last.id : null,
    };
  }

  async unreadCount(inbox: Inbox): Promise<{ count: number }> {
    return { count: await this.repo.countUnread(inbox) };
  }

  async markRead(inbox: Inbox, id: string): Promise<Notification> {
    const row = await this.repo.markRead(inbox, id);
    if (!row) throw new NotFoundError('Notificação', id);
    return toNotificationDto(row);
  }

  async markAllRead(inbox: Inbox): Promise<void> {
    await this.repo.markAllRead(inbox);
  }

  private async mustFind(inbox: Inbox, id: string): Promise<NotificationRow> {
    const row = await this.repo.findById(inbox, id);
    if (!row) throw new NotFoundError('Notificação', id);
    return row;
  }
}
