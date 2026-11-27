import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type CustomFieldType,
  type TaskPriority,
  type TaskStatus,
} from '@clickunicap/shared';

export const SEED_PASSWORD = 'senha123';
export const SEED_USERS = [
  { name: 'Ana', email: 'ana@clickunicap.dev' },
  { name: 'Bruno', email: 'bruno@clickunicap.dev' },
  { name: 'Carla', email: 'carla@clickunicap.dev' },
];

export interface SeedTask {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIndex: number | null;
  position: number;
}

/** Monta tarefas variadas, com a posição contada por coluna. Função pura para poder testar. */
export function buildSeedTasks(prefix: string, total: number): SeedTask[] {
  const nextPosition: Record<string, number> = {};
  return Array.from({ length: total }, (_, i) => {
    const status = TASK_STATUSES[i % TASK_STATUSES.length] as TaskStatus;
    nextPosition[status] = (nextPosition[status] ?? 0) + 1;
    return {
      title: `${prefix}: tarefa ${i + 1}`,
      status,
      priority: TASK_PRIORITIES[i % TASK_PRIORITIES.length] as TaskPriority,
      assigneeIndex: i % 4 === 3 ? null : i % SEED_USERS.length,
      position: nextPosition[status],
    };
  });
}

export type SeedCustomFieldValue = string | number | boolean | null;

export interface SeedCustomField {
  name: string;
  type: CustomFieldType;
  options: string[] | null;
  isRequired: boolean;
  /** Valor da tarefa de índice `i` (null = sem valor). */
  valueFor: (i: number) => SeedCustomFieldValue;
}

const SEED_AREAS = ['Design', 'Backend', 'Frontend'];

/** Campos personalizados de exemplo (Pessoa 8), criados em cada projeto do seed, com um tipo de cada. */
export const SEED_CUSTOM_FIELDS: SeedCustomField[] = [
  {
    name: 'Área',
    type: 'dropdown',
    options: SEED_AREAS,
    isRequired: false,
    valueFor: (i) => SEED_AREAS[i % SEED_AREAS.length] ?? null,
  },
  { name: 'Estimativa (h)', type: 'number', options: null, isRequired: false, valueFor: (i) => (i % 5) + 1 },
  {
    name: 'Revisão',
    type: 'date',
    options: null,
    isRequired: false,
    valueFor: (i) => (i % 3 === 0 ? `2026-12-${String((i % 28) + 1).padStart(2, '0')}` : null),
  },
  { name: 'Aprovado pelo cliente', type: 'checkbox', options: null, isRequired: false, valueFor: (i) => i % 2 === 0 },
  {
    name: 'Ticket',
    type: 'text',
    options: null,
    isRequired: false,
    valueFor: (i) => (i % 4 === 0 ? `CU-${100 + i}` : null),
  },
];

/** Valores das tarefas para os campos gravados: só os não nulos, como a API grava. Função pura para poder testar. */
export function buildSeedCustomFieldValues(
  taskIds: string[],
  fields: { id: string; seed: SeedCustomField }[],
): { taskId: string; fieldId: string; value: SeedCustomFieldValue }[] {
  return taskIds.flatMap((taskId, i) =>
    fields
      .map(({ id, seed }) => ({ taskId, fieldId: id, value: seed.valueFor(i) }))
      .filter((entry) => entry.value !== null),
  );
}
