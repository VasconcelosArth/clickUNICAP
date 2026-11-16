import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, ilike, inArray, lte, max, type SQL } from 'drizzle-orm';
import type { TaskFilters, TaskStatus } from '@clickunicap/shared';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { projects, tasks } from '@/core/database/schema';

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

export interface MovePlan {
  patch: Partial<NewTaskRow>;
  renumber: { id: string; position: number }[];
}

export interface MoveResult {
  before: TaskRow;
  after: TaskRow;
}

/** Busca literal: % e _ digitados pelo usuário não funcionam como curinga. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** O workspace da tarefa vem do projeto, então toda leitura passa por um join com projects. */
@Injectable()
export class TasksRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async insert(data: NewTaskRow): Promise<TaskRow> {
    const [row] = await this.db.insert(tasks).values(data).returning();
    if (!row) throw new Error('Falha ao criar tarefa');
    return row;
  }

  async list(workspaceId: string, projectId: string, filters: TaskFilters): Promise<TaskRow[]> {
    const where: (SQL | undefined)[] = [eq(projects.workspaceId, workspaceId), eq(tasks.projectId, projectId)];
    if (filters.status?.length) where.push(inArray(tasks.status, filters.status));
    if (filters.priority?.length) where.push(inArray(tasks.priority, filters.priority));
    if (filters.assigneeId?.length) where.push(inArray(tasks.assigneeId, filters.assigneeId));
    if (filters.dueFrom) where.push(gte(tasks.dueDate, filters.dueFrom));
    if (filters.dueTo) where.push(lte(tasks.dueDate, filters.dueTo));
    if (filters.search) where.push(ilike(tasks.title, `%${escapeLike(filters.search)}%`));

    const rows = await this.db
      .select({ task: tasks })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(...where))
      .orderBy(asc(tasks.status), asc(tasks.position));
    return rows.map((r) => r.task);
  }

  async findById(workspaceId: string, id: string): Promise<TaskRow | undefined> {
    const [row] = await this.db
      .select({ task: tasks })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(projects.workspaceId, workspaceId), eq(tasks.id, id)))
      .limit(1);
    return row?.task;
  }

  /** Maior posição da coluna, ou null se ela estiver vazia. */
  async maxPosition(workspaceId: string, projectId: string, status: TaskStatus): Promise<number | null> {
    const [row] = await this.db
      .select({ value: max(tasks.position) })
      .from(tasks)
      .where(and(this.inWorkspace(workspaceId), eq(tasks.projectId, projectId), eq(tasks.status, status)));
    return row?.value ?? null;
  }

  async update(workspaceId: string, id: string, data: Partial<NewTaskRow>): Promise<TaskRow | undefined> {
    const [row] = await this.db
      .update(tasks)
      .set(data)
      .where(and(this.inWorkspace(workspaceId), eq(tasks.id, id)))
      .returning();
    return row;
  }

  /**
   * Move a tarefa numa transação. `plan` recebe a linha atual e a coluna de destino (já travadas) e
   * devolve o que gravar. A regra de posição fica no service; aqui só há SQL e atomicidade.
   * Trava o projeto inteiro: duas movimentações do mesmo projeto rodam uma após a outra.
   */
  async moveTask(
    workspaceId: string,
    id: string,
    targetStatus: TaskStatus,
    plan: (current: TaskRow, column: TaskRow[]) => MovePlan,
  ): Promise<MoveResult | undefined> {
    const found = await this.findById(workspaceId, id);
    if (!found) return undefined;

    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, found.projectId), eq(projects.workspaceId, workspaceId)))
        .for('update');

      const [current] = await tx
        .select()
        .from(tasks)
        .where(and(this.inWorkspace(workspaceId), eq(tasks.id, id)))
        .limit(1);
      if (!current) return undefined;

      const column = await tx
        .select()
        .from(tasks)
        .where(
          and(this.inWorkspace(workspaceId), eq(tasks.projectId, current.projectId), eq(tasks.status, targetStatus)),
        )
        .orderBy(asc(tasks.position));

      const { patch, renumber } = plan(current, column);
      for (const r of renumber) {
        await tx
          .update(tasks)
          .set({ position: r.position })
          .where(and(this.inWorkspace(workspaceId), eq(tasks.id, r.id)));
      }
      const [after] = await tx
        .update(tasks)
        .set(patch)
        .where(and(this.inWorkspace(workspaceId), eq(tasks.id, id)))
        .returning();
      if (!after) throw new Error('Falha ao mover tarefa');
      return { before: current, after };
    });
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    await this.db.delete(tasks).where(and(this.inWorkspace(workspaceId), eq(tasks.id, id)));
  }

  /** Escopo para os comandos sem join: a tarefa precisa estar num projeto deste workspace. */
  private inWorkspace(workspaceId: string): SQL {
    return inArray(
      tasks.projectId,
      this.db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId)),
    );
  }
}
