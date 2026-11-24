import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { projects, tasks, timeEntries, users } from '@/core/database/schema';

export type TimeEntryInsert = typeof timeEntries.$inferInsert;

/** Entrada com o nome de quem lançou e o projeto e o título da tarefa (para as regras do service). */
export interface TimeEntryRow {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  startedAt: Date;
  endedAt: Date | null;
  minutes: number | null;
  note: string | null;
  createdAt: Date;
  projectId: string;
  taskTitle: string;
}

const columns = {
  id: timeEntries.id,
  taskId: timeEntries.taskId,
  userId: timeEntries.userId,
  userName: users.name,
  startedAt: timeEntries.startedAt,
  endedAt: timeEntries.endedAt,
  minutes: timeEntries.minutes,
  note: timeEntries.note,
  createdAt: timeEntries.createdAt,
  projectId: tasks.projectId,
  taskTitle: tasks.title,
};

/**
 * SQL do controle de tempo. `time_entries` não tem `workspace_id`: o workspace vem do projeto da tarefa,
 * e toda leitura e escrita confere que a tarefa está num projeto deste workspace.
 */
@Injectable()
export class TimeTrackingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Entradas da tarefa, as mais recentes primeiro. */
  async listByTask(workspaceId: string, taskId: string): Promise<TimeEntryRow[]> {
    return this.selectRows()
      .where(and(eq(timeEntries.taskId, taskId), eq(projects.workspaceId, workspaceId)))
      .orderBy(desc(timeEntries.startedAt), desc(timeEntries.createdAt));
  }

  async findById(workspaceId: string, id: string): Promise<TimeEntryRow | undefined> {
    const [row] = await this.selectRows()
      .where(and(eq(timeEntries.id, id), eq(projects.workspaceId, workspaceId)))
      .limit(1);
    return row;
  }

  /** Timer ativo do usuário, se ele estiver numa tarefa deste workspace. */
  async findRunning(workspaceId: string, userId: string): Promise<TimeEntryRow | undefined> {
    const [row] = await this.selectRows()
      .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endedAt), eq(projects.workspaceId, workspaceId)))
      .limit(1);
    return row;
  }

  /**
   * Grava a entrada. Devolve `undefined` se o usuário já tiver um timer ativo (em qualquer workspace):
   * o índice único parcial `time_entries_one_running_per_user` barra o segundo, mesmo com dois cliques juntos.
   */
  async insert(values: TimeEntryInsert): Promise<{ id: string } | undefined> {
    const [row] = await this.db
      .insert(timeEntries)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: timeEntries.id });
    return row;
  }

  /** Para o timer `id` se ele ainda estiver contando. Devolve false se outra requisição já parou. */
  async stop(workspaceId: string, id: string, endedAt: Date, minutes: number): Promise<boolean> {
    const updated = await this.db
      .update(timeEntries)
      .set({ endedAt, minutes })
      .where(and(eq(timeEntries.id, id), isNull(timeEntries.endedAt), this.taskInWorkspace(workspaceId)))
      .returning({ id: timeEntries.id });
    return updated.length > 0;
  }

  async update(
    workspaceId: string,
    id: string,
    patch: Partial<Pick<TimeEntryInsert, 'startedAt' | 'minutes' | 'note'>>,
  ): Promise<boolean> {
    const updated = await this.db
      .update(timeEntries)
      .set(patch)
      .where(and(eq(timeEntries.id, id), this.taskInWorkspace(workspaceId)))
      .returning({ id: timeEntries.id });
    return updated.length > 0;
  }

  /** Devolve true se apagou alguma linha. */
  async delete(workspaceId: string, id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(timeEntries)
      .where(and(eq(timeEntries.id, id), this.taskInWorkspace(workspaceId)))
      .returning({ id: timeEntries.id });
    return deleted.length > 0;
  }

  private selectRows() {
    return this.db
      .select(columns)
      .from(timeEntries)
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId));
  }

  /** Escopo para os comandos sem join: a tarefa da entrada precisa estar num projeto deste workspace. */
  private taskInWorkspace(workspaceId: string): SQL {
    return inArray(
      timeEntries.taskId,
      this.db
        .select({ id: tasks.id })
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(eq(projects.workspaceId, workspaceId)),
    );
  }
}
