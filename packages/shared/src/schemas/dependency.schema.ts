import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common.schema';
import { taskSchema } from './task.schema';

/**
 * Dependência entre tarefas: `taskId` fica bloqueada até `dependsOnTaskId` ser concluída.
 * No ClickUp: "esperando por" (blocked by) e "bloqueando" (blocking).
 */
export const taskDependencySchema = z.object({
  taskId: idSchema,
  dependsOnTaskId: idSchema,
  createdAt: dateTimeSchema,
});
export type TaskDependency = z.infer<typeof taskDependencySchema>;

/** Body de POST /api/tasks/:taskId/dependencies: a tarefa que passa a bloquear `:taskId`. */
export const createTaskDependencySchema = z.object({
  dependsOnTaskId: idSchema,
});
export type CreateTaskDependencyInput = z.infer<typeof createTaskDependencySchema>;

/** Resumo da outra tarefa da dependência, para a tela de detalhe não precisar buscar cada uma. */
export const dependencyTaskSchema = taskSchema.pick({
  id: true,
  title: true,
  status: true,
  startDate: true,
  dueDate: true,
});
export type DependencyTask = z.infer<typeof dependencyTaskSchema>;

/** Resposta de GET /api/tasks/:taskId/dependencies. */
export const taskDependenciesSchema = z.object({
  /** Tarefas que precisam terminar antes desta. */
  blockedBy: z.array(dependencyTaskSchema),
  /** Tarefas que esperam esta terminar. */
  blocking: z.array(dependencyTaskSchema),
});
export type TaskDependencies = z.infer<typeof taskDependenciesSchema>;
