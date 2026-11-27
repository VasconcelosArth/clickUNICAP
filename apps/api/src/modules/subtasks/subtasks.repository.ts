import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, max } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { projects, subtasks, tasks } from '@/core/database/schema';

export type SubtaskRow = typeof subtasks.$inferSelect;
export type SubtaskPatch = Partial<Pick<SubtaskRow, 'title' | 'isDone' | 'position'>>;

@Injectable()
export class SubtasksRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** A tarefa existe neste workspace? Devolve null se for de outro. */
  async findTaskScope(workspaceId: string, taskId: string) {
    const [row] = await this.db
      .select({ taskId: tasks.id, archivedAt: projects.archivedAt })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(tasks.id, taskId), eq(projects.workspaceId, workspaceId)));
    return row ? { taskId: row.taskId, archived: row.archivedAt !== null } : null;
  }

  async listByTask(workspaceId: string, taskId: string): Promise<SubtaskRow[]> {
    const rows = await this.db
      .select({ subtask: subtasks })
      .from(subtasks)
      .innerJoin(tasks, eq(tasks.id, subtasks.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(subtasks.taskId, taskId), eq(projects.workspaceId, workspaceId)))
      .orderBy(asc(subtasks.position));
    return rows.map((r) => r.subtask);
  }

  async findById(workspaceId: string, id: string) {
    const [row] = await this.db
      .select({ subtask: subtasks, archivedAt: projects.archivedAt })
      .from(subtasks)
      .innerJoin(tasks, eq(tasks.id, subtasks.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(subtasks.id, id), eq(projects.workspaceId, workspaceId)));
    return row ? { subtask: row.subtask, archived: row.archivedAt !== null } : null;
  }

  /** Cria no fim da lista (maior position + 1). */
  async insertAtEnd(taskId: string, title: string): Promise<SubtaskRow> {
    const [last] = await this.db
      .select({ value: max(subtasks.position) })
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId));
    const [row] = await this.db
      .insert(subtasks)
      .values({ taskId, title, position: (last?.value ?? 0) + 1 })
      .returning();
    if (!row) throw new Error('Falha ao inserir a subtarefa');
    return row;
  }

  async update(id: string, patch: SubtaskPatch): Promise<SubtaskRow | null> {
    const [row] = await this.db.update(subtasks).set(patch).where(eq(subtasks.id, id)).returning();
    return row ?? null;
  }

  async remove(id: string): Promise<void> {
    await this.db.delete(subtasks).where(eq(subtasks.id, id));
  }
}
