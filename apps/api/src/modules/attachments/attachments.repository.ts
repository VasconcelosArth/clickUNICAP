import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { attachments, projects, tasks } from '@/core/database/schema';

export type AttachmentRow = typeof attachments.$inferSelect;
export type NewAttachmentRow = typeof attachments.$inferInsert;

const KEY_BATCH_SIZE = 500;

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

  /** Storage keys of a task's attachments (read before the task is deleted, because the cascade removes them). */
  async listStorageKeysByTask(workspaceId: string, taskId: string): Promise<string[]> {
    const rows = await this.db
      .select({ storageKey: attachments.storageKey })
      .from(attachments)
      .innerJoin(tasks, eq(tasks.id, attachments.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(attachments.taskId, taskId), eq(projects.workspaceId, workspaceId)));
    return rows.map((row) => row.storageKey);
  }

  /** Storage keys of every attachment in the workspace (read before the workspace is deleted). */
  async listStorageKeysByWorkspace(workspaceId: string): Promise<string[]> {
    const rows = await this.db
      .select({ storageKey: attachments.storageKey })
      .from(attachments)
      .innerJoin(tasks, eq(tasks.id, attachments.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(eq(projects.workspaceId, workspaceId));
    return rows.map((row) => row.storageKey);
  }

  /**
   * Maintenance only (orphan file cleanup, across all workspaces): which of these keys still have a record.
   * Never exposed through a route.
   */
  async findExistingStorageKeys(storageKeys: string[]): Promise<Set<string>> {
    const existing = new Set<string>();
    for (let start = 0; start < storageKeys.length; start += KEY_BATCH_SIZE) {
      const batch = storageKeys.slice(start, start + KEY_BATCH_SIZE);
      const rows = await this.db
        .select({ storageKey: attachments.storageKey })
        .from(attachments)
        .where(inArray(attachments.storageKey, batch));
      rows.forEach((row) => existing.add(row.storageKey));
    }
    return existing;
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
