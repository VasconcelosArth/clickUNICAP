import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  type CommentMentionedPayload,
  DomainEvents,
  type TaskAssignedPayload,
  type TaskDueSoonPayload,
} from '@/core/events';
import { type NotifyInput, NotificationsService } from './notifications.service';

/**
 * Transforma eventos de domínio em notificações. Os outros módulos só emitem o evento
 * e não conhecem este módulo. Uma falha aqui é registrada no log e nunca derruba a ação de quem emitiu.
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger('Notifications');

  constructor(private readonly service: NotificationsService) {}

  @OnEvent(DomainEvents.TaskAssigned, { async: true })
  onTaskAssigned(p: TaskAssignedPayload) {
    return this.notify({
      type: 'task_assigned',
      userId: p.assigneeId,
      workspaceId: p.workspaceId,
      taskId: p.taskId,
      actorId: p.by,
    });
  }

  @OnEvent(DomainEvents.CommentMentioned, { async: true })
  onCommentMentioned(p: CommentMentionedPayload) {
    return this.notify({
      type: 'comment_mentioned',
      userId: p.mentionedUserId,
      workspaceId: p.workspaceId,
      taskId: p.taskId,
      actorId: p.by,
      commentId: p.commentId,
    });
  }

  @OnEvent(DomainEvents.TaskDueSoon, { async: true })
  onTaskDueSoon(p: TaskDueSoonPayload) {
    return this.notify({
      type: 'task_due_soon',
      userId: p.assigneeId,
      workspaceId: p.workspaceId,
      taskId: p.taskId,
    });
  }

  private async notify(input: NotifyInput): Promise<void> {
    try {
      await this.service.notify(input);
    } catch (error) {
      this.logger.error(`Falha ao criar a notificação ${input.type} da tarefa ${input.taskId}`, error);
    }
  }
}
