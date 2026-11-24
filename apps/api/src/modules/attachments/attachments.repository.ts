import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { attachments, projects, tasks } from '@/core/database/schema';

export type AttachmentRow = typeof attachments.$inferSelect;
export type NewAttachmentRow = typeof attachments.$inferInsert;

/** SQL only. Every read and the delete are scoped to the workspace through task → project. */
@Injectable()
export class AttachmentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listByTask(workspaceId: string, taskId: string): Promise<AttachmentRow[]> {
    const rows = await this.db
      .select({ attachment: attachments })
      .from(attachments)
      .innerJoin(tasks, eq(tasks.id, attachments.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(attachments.taskId, taskId), eq(projects.workspaceId, workspaceId)))
      .orderBy(asc(attachments.createdAt));
    return rows.map((row) => row.attachment);
  }

  async findById(workspaceId: string, id: string): Promise<AttachmentRow | null> {
    const [row] = await this.db
      .select({ attachment: attachments })
      .from(attachments)
      .innerJoin(tasks, eq(tasks.id, attachments.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(attachments.id, id), eq(projects.workspaceId, workspaceId)))
      .limit(1);
    return row?.attachment ?? null;
  }

  async insert(data: NewAttachmentRow): Promise<AttachmentRow> {
    const [row] = await this.db.insert(attachments).values(data).returning();
    if (!row) throw new Error('Insert into attachments returned no row');
    return row;
  }

  /** Returns the deleted row, or null when it does not exist in this workspace. */
  async delete(workspaceId: string, id: string): Promise<AttachmentRow | null> {
    const taskIdsOfWorkspace = this.db
      .select({ id: tasks.id })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(eq(projects.workspaceId, workspaceId));

    const [row] = await this.db
      .delete(attachments)
      .where(and(eq(attachments.id, id), inArray(attachments.taskId, taskIdsOfWorkspace)))
      .returning();
    return row ?? null;
  }
}
