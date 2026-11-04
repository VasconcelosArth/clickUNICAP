import { getTableColumns, getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { MEMBER_ROLES, TASK_PRIORITIES, TASK_STATUSES } from '@clickunicap/shared';
import * as schema from './index';

const tables = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable));

describe('schema do banco', () => {
  it('tem todas as tabelas do modelo de dados (docs/06)', () => {
    expect(tables.map((t) => getTableName(t)).sort()).toEqual(
      [
        'attachments',
        'comment_mentions',
        'comments',
        'custom_fields',
        'notifications',
        'password_reset_tokens',
        'projects',
        'refresh_tokens',
        'subtasks',
        'task_custom_field_values',
        'task_dependencies',
        'tasks',
        'time_entries',
        'users',
        'workspace_invites',
        'workspace_members',
        'workspaces',
      ].sort(),
    );
  });

  it('usa snake_case em todos os nomes de coluna', () => {
    for (const table of tables) {
      for (const col of Object.values(getTableColumns(table))) {
        expect(`${getTableName(table)}.${col.name}`).toMatch(/^[a-z_]+\.[a-z][a-z0-9_]*$/);
      }
    }
  });

  it('enums do banco usam exatamente os valores do @clickunicap/shared', () => {
    expect(schema.taskStatusEnum.enumValues).toEqual([...TASK_STATUSES]);
    expect(schema.taskPriorityEnum.enumValues).toEqual([...TASK_PRIORITIES]);
    expect(schema.memberRoleEnum.enumValues).toEqual([...MEMBER_ROLES]);
  });

  it('tarefas começam como "todo" e prioridade "medium"', () => {
    const cols = getTableColumns(schema.tasks);
    expect(cols.status.default).toBe('todo');
    expect(cols.priority.default).toBe('medium');
  });
});
