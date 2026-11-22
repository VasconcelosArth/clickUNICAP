import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CreateCommentInput, UpdateCommentInput } from '@clickunicap/shared';
import { ForbiddenError, NotFoundError } from '@/core/errors';
import { DomainEvents } from '@/core/events';
import { WorkspacesService } from '@/modules/workspaces/workspaces.service';
import { CommentsRepository, type CommentRow } from './comments.repository';
import { extractMentionedUserIds } from './utils/extract-mentions';

interface Ctx {
  userId: string;
  workspaceId: string;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly repo: CommentsRepository,
    private readonly workspaces: WorkspacesService,
    private readonly events: EventEmitter2,
  ) {}

  async list(workspaceId: string, taskId: string): Promise<CommentRow[]> {
    const scope = await this.repo.findTaskScope(workspaceId, taskId);
    if (!scope) throw new NotFoundError('Task', taskId);
    return this.repo.listByTask(workspaceId, taskId);
  }

  async create(ctx: Ctx, taskId: string, input: CreateCommentInput): Promise<CommentRow> {
    const scope = await this.repo.findTaskScope(ctx.workspaceId, taskId);
    if (!scope) throw new NotFoundError('Task', taskId);

    const mentioned = await this.validMentions(ctx.workspaceId, input.body);
    const comment = await this.repo.createWithMentions({ taskId, authorId: ctx.userId, body: input.body }, mentioned);
    this.emitMentions(comment, ctx.userId, mentioned);
    return comment;
  }

  async update(ctx: Ctx, id: string, input: UpdateCommentInput): Promise<CommentRow> {
    const found = await this.repo.findById(ctx.workspaceId, id);
    if (!found) throw new NotFoundError('Comment', id);
    if (found.comment.authorId !== ctx.userId) {
      throw new ForbiddenError('Só o autor pode editar o comentário');
    }

    const previous = await this.repo.listMentionedUserIds(id);
    const mentioned = await this.validMentions(ctx.workspaceId, input.body);
    const updated = await this.repo.updateWithMentions(id, input.body, mentioned);
    if (!updated) throw new NotFoundError('Comment', id);

    // Só quem foi mencionado agora e ainda não tinha sido recebe evento.
    this.emitMentions(
      updated,
      ctx.userId,
      mentioned.filter((u) => !previous.includes(u)),
    );
    return updated;
  }

  async remove(ctx: Ctx, id: string): Promise<void> {
    const found = await this.repo.findById(ctx.workspaceId, id);
    if (!found) throw new NotFoundError('Comment', id);
    if (found.comment.authorId !== ctx.userId) {
      throw new ForbiddenError('Só o autor pode apagar o comentário');
    }
    await this.repo.remove(id);
  }

  /** Só conta menção de quem é membro do workspace. */
  private async validMentions(workspaceId: string, body: string): Promise<string[]> {
    const ids = extractMentionedUserIds(body);
    const checked = await Promise.all(
      ids.map(async (userId) => ((await this.workspaces.isMember(workspaceId, userId)) ? userId : null)),
    );
    return checked.filter((userId): userId is string => userId !== null);
  }

  private emitMentions(comment: CommentRow, by: string, userIds: string[]): void {
    for (const mentionedUserId of userIds) {
      this.events.emit(DomainEvents.CommentMentioned, {
        commentId: comment.id,
        taskId: comment.taskId,
        mentionedUserId,
        by,
      });
    }
  }
}
