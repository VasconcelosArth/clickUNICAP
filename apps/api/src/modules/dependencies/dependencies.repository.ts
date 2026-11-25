import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { projects, taskDependencies, tasks } from '@/core/database/schema';
import type { DependencyEdge } from './utils/cycle';

export type DependencyRow = typeof taskDependencies.$inferSelect;

export interface DependencyTaskRow {
  id: string;
  title: string;
  status: (typeof tasks.$inferSelect)['status'];
  startDate: string | null;
  dueDate: string | null;
}

export type InsertResult = { created: DependencyRow } | { rejected: 'exists' | 'cycle' };

const summary = {
  id: tasks.id,
  title: tasks.title,
  status: tasks.status,
  startDate: tasks.startDate,
  dueDate: tasks.dueDate,
};

/**
 * SQL das dependências. O workspace vem do projeto da tarefa: toda leitura confere que as DUAS tarefas
 * da dependência estão em projetos deste workspace.
 */
@Injectable()
export class DependenciesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Tarefas que precisam terminar antes de `taskId`. */
  async listBlockedBy(workspaceId: string, taskId: string): Promise<DependencyTaskRow[]> {
    return this.db
      .select(summary)
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.dependsOnTaskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(taskDependencies.taskId, taskId), eq(projects.workspaceId, workspaceId)))
      .orderBy(asc(tasks.title));
  }

  /** Tarefas que esperam `taskId` terminar. */
  async listBlocking(workspaceId: string, taskId: string): Promise<DependencyTaskRow[]> {
    return this.db
      .select(summary)
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(taskDependencies.dependsOnTaskId, taskId), eq(projects.workspaceId, workspaceId)))
      .orderBy(asc(tasks.title));
  }

  /** Todas as dependências entre tarefas do projeto (usado pelo Gantt). */
  async listByProject(workspaceId: string, projectId: string): Promise<DependencyRow[]> {
    const blocker = alias(tasks, 'blocker');
    const rows = await this.db
      .select({ dependency: taskDependencies })
      .from(taskDependencies)
      .innerJoin(tasks, eq(tasks.id, taskDependencies.taskId))
      .innerJoin(blocker, eq(blocker.id, taskDependencies.dependsOnTaskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(
        and(eq(projects.workspaceId, workspaceId), eq(tasks.projectId, projectId), eq(blocker.projectId, projectId)),
      )
      .orderBy(asc(taskDependencies.createdAt));
    return rows.map((r) => r.dependency);
  }

  async find(workspaceId: string, taskId: string, dependsOnTaskId: string): Promise<DependencyRow | undefined> {
    const [row] = await this.db
      .select()
      .from(taskDependencies)
      .where(
        and(
          eq(taskDependencies.taskId, taskId),
          eq(taskDependencies.dependsOnTaskId, dependsOnTaskId),
          this.taskInWorkspace(workspaceId),
        ),
      )
      .limit(1);
    return row;
  }

  /**
   * Grava a dependência numa transação, travando o projeto: duas pessoas ligando tarefas ao mesmo tempo
   * não conseguem, juntas, fechar um ciclo. `isCycle` recebe o grafo atual do projeto; a regra fica no service.
   */
  async insertUnlessCycle(
    workspaceId: string,
    projectId: string,
    edge: DependencyEdge,
    isCycle: (current: DependencyEdge[]) => boolean,
  ): Promise<InsertResult> {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
        .for('update');

      const current = await tx
        .select({ taskId: taskDependencies.taskId, dependsOnTaskId: taskDependencies.dependsOnTaskId })
        .from(taskDependencies)
        .innerJoin(tasks, eq(tasks.id, taskDependencies.taskId))
        .where(eq(tasks.projectId, projectId));

      if (current.some((e) => e.taskId === edge.taskId && e.dependsOnTaskId === edge.dependsOnTaskId)) {
        return { rejected: 'exists' as const };
      }
      if (isCycle(current)) return { rejected: 'cycle' as const };

      const [created] = await tx.insert(taskDependencies).values(edge).onConflictDoNothing().returning();
      return created ? { created } : { rejected: 'exists' as const };
    });
  }

  /** Devolve true se apagou alguma linha. */
  async delete(workspaceId: string, taskId: string, dependsOnTaskId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(taskDependencies)
      .where(
        and(
          eq(taskDependencies.taskId, taskId),
          eq(taskDependencies.dependsOnTaskId, dependsOnTaskId),
          this.taskInWorkspace(workspaceId),
        ),
      )
      .returning({ taskId: taskDependencies.taskId });
    return deleted.length > 0;
  }

  /** Escopo para os comandos sem join: a tarefa bloqueada precisa estar num projeto deste workspace. */
  private taskInWorkspace(workspaceId: string): SQL {
    return inArray(
      taskDependencies.taskId,
      this.db
        .select({ id: tasks.id })
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(eq(projects.workspaceId, workspaceId)),
    );
  }
}
