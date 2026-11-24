import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { projects, tasks, timeEntries, users } from '@/core/database/schema';

export type TimeEntryInsert = typeof timeEntries.$inferInsert;

/**
 * Resultado de `startReplacing`. `elsewhere`: o timer ativo está em outro workspace.
 * `race`: outro início gravou ao mesmo tempo (o service tenta de novo).
 */
export type StartResult = { startedId: string; stoppedId: string | null } | { rejected: 'elsewhere' | 'race' };

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
   * Inicia o timer de `userId` em `taskId`, parando antes o timer ativo dele (numa transação que trava esse timer).
   * - Ativo na mesma tarefa: não muda nada e devolve o próprio timer.
   * - Ativo em outro workspace: não mexe nele (`elsewhere`). Esta é a única leitura que olha além do workspace:
   *   o índice de timer ativo vale para todos os workspaces do usuário. Só o id do workspace é usado, nada sai daqui.
   * - Dois inícios ao mesmo tempo sem timer ativo: o índice único parcial barra o segundo (`race`).
   * `minutesFor` calcula os minutos do timer parado (a regra fica no service).
   */
  async startReplacing(
    workspaceId: string,
    userId: string,
    taskId: string,
    now: Date,
    minutesFor: (startedAt: Date) => number,
  ): Promise<StartResult> {
    return this.db.transaction(async (tx) => {
      const [running] = await tx
        .select({
          id: timeEntries.id,
          taskId: timeEntries.taskId,
          startedAt: timeEntries.startedAt,
          workspaceId: projects.workspaceId,
        })
        .from(timeEntries)
        .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endedAt)))
        .limit(1)
        .for('update', { of: timeEntries });

      if (running && running.workspaceId !== workspaceId) return { rejected: 'elsewhere' as const };
      if (running && running.taskId === taskId) return { startedId: running.id, stoppedId: null };
      if (running) {
        await tx
          .update(timeEntries)
          .set({ endedAt: now, minutes: minutesFor(running.startedAt) })
          .where(eq(timeEntries.id, running.id));
      }

      const [created] = await tx
        .insert(timeEntries)
        .values({ taskId, userId, startedAt: now })
        .onConflictDoNothing()
        .returning({ id: timeEntries.id });
      if (!created) return { rejected: 'race' as const };
      return { startedId: created.id, stoppedId: running?.id ?? null };
    });
  }

  /** Grava uma entrada já terminada (lançamento manual). */
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
