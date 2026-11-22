import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { commentMentions, comments, projects, tasks } from '@/core/database/schema';

export type CommentRow = typeof comments.$inferSelect;

@Injectable()
export class CommentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Lista os comentários de uma tarefa do workspace, do mais antigo ao mais novo. */
  async listByTask(workspaceId: string, taskId: string): Promise<CommentRow[]> {
    const rows = await this.db
      .select({ comment: comments })
      .from(comments)
      .innerJoin(tasks, eq(tasks.id, comments.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(comments.taskId, taskId), eq(projects.workspaceId, workspaceId)))
      .orderBy(asc(comments.createdAt));
    return rows.map((r) => r.comment);
  }

  /** Comentário do workspace (null se for de outro) e se o projeto está arquivado. */
  async findById(workspaceId: string, id: string) {
    const [row] = await this.db
      .select({ comment: comments, archivedAt: projects.archivedAt })
      .from(comments)
      .innerJoin(tasks, eq(tasks.id, comments.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(comments.id, id), eq(projects.workspaceId, workspaceId)));
    return row ? { comment: row.comment, archived: row.archivedAt !== null } : null;
  }

  /** Cria o comentário e as menções na mesma transação. */
  async createWithMentions(
    data: { taskId: string; authorId: string; body: string },
    mentionedUserIds: string[],
  ): Promise<CommentRow> {
    return this.db.transaction(async (tx) => {
      const [comment] = await tx.insert(comments).values(data).returning();
      if (!comment) throw new Error('Falha ao inserir o comentário');
      if (mentionedUserIds.length > 0) {
        await tx.insert(commentMentions).values(mentionedUserIds.map((userId) => ({ commentId: comment.id, userId })));
      }
      return comment;
    });
  }

  /** Atualiza o texto e troca as menções (apaga as antigas e grava as novas). */
  async updateWithMentions(id: string, body: string, mentionedUserIds: string[]): Promise<CommentRow | null> {
    return this.db.transaction(async (tx) => {
      const [comment] = await tx.update(comments).set({ body }).where(eq(comments.id, id)).returning();
      if (!comment) return null;
      await tx.delete(commentMentions).where(eq(commentMentions.commentId, id));
      if (mentionedUserIds.length > 0) {
        await tx.insert(commentMentions).values(mentionedUserIds.map((userId) => ({ commentId: id, userId })));
      }
      return comment;
    });
  }

  /** As menções somem junto (cascade na FK). */
  async remove(id: string): Promise<void> {
    await this.db.delete(comments).where(eq(comments.id, id));
  }
}
