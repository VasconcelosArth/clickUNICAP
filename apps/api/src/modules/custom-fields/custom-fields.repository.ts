import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { customFields, projects, taskCustomFieldValues, tasks } from '@/core/database/schema';

export type CustomFieldRow = typeof customFields.$inferSelect;
export type NewCustomFieldRow = typeof customFields.$inferInsert;
export type CustomFieldValueRow = typeof taskCustomFieldValues.$inferSelect;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class CustomFieldsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  listForProject(workspaceId: string, projectId: string): Promise<CustomFieldRow[]> {
    return this.db
      .select({ field: customFields })
      .from(customFields)
      .innerJoin(projects, eq(projects.id, customFields.projectId))
      .where(and(eq(projects.workspaceId, workspaceId), eq(customFields.projectId, projectId)))
      .orderBy(asc(customFields.position), asc(customFields.createdAt))
      .then((rows) => rows.map((row) => row.field));
  }

  async findField(workspaceId: string, fieldId: string): Promise<CustomFieldRow | undefined> {
    const [row] = await this.db
      .select({ field: customFields })
      .from(customFields)
      .innerJoin(projects, eq(projects.id, customFields.projectId))
      .where(and(eq(projects.workspaceId, workspaceId), eq(customFields.id, fieldId)))
      .limit(1);
    return row?.field;
  }

  /**
   * Cria o campo numa transação que trava a linha do projeto (`SELECT ... FOR UPDATE`, como em `dependencies`).
   * O nome único por projeto não tem constraint no banco: a regra ignora maiúsculas e minúsculas e uma migration
   * nova com índice em `lower(name)` arriscaria conflito com as migrations das outras frentes. Com o projeto travado,
   * duas criações simultâneas com o mesmo nome rodam uma depois da outra e a segunda vê a primeira.
   * `build` recebe os campos atuais do projeto e devolve a linha a gravar, ou lança o erro de domínio (rollback).
   */
  async insertLocked(
    workspaceId: string,
    projectId: string,
    build: (current: CustomFieldRow[]) => NewCustomFieldRow,
  ): Promise<CustomFieldRow> {
    return this.db.transaction(async (tx) => {
      const current = await this.lockProjectFields(tx, workspaceId, projectId);
      const [row] = await tx.insert(customFields).values(build(current)).returning();
      if (!row) throw new Error('Falha ao criar campo personalizado');
      return row;
    });
  }

  /** Igual a `insertLocked`, para a edição: `check` valida contra os campos atuais com o projeto travado. */
  async updateLocked(
    workspaceId: string,
    projectId: string,
    fieldId: string,
    data: Partial<Pick<NewCustomFieldRow, 'name' | 'options' | 'isRequired' | 'position'>>,
    check: (current: CustomFieldRow[]) => void,
  ): Promise<CustomFieldRow | undefined> {
    return this.db.transaction(async (tx) => {
      check(await this.lockProjectFields(tx, workspaceId, projectId));
      const [row] = await tx
        .update(customFields)
        .set(data)
        .where(and(eq(customFields.id, fieldId), eq(customFields.projectId, projectId)))
        .returning();
      return row;
    });
  }

  private async lockProjectFields(tx: Transaction, workspaceId: string, projectId: string) {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .for('update');
    if (!project) return [];
    return tx
      .select()
      .from(customFields)
      .where(eq(customFields.projectId, projectId))
      .orderBy(asc(customFields.position), asc(customFields.createdAt));
  }

  async delete(workspaceId: string, fieldId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(customFields)
      .where(
        and(
          eq(customFields.id, fieldId),
          inArray(
            customFields.projectId,
            this.db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId)),
          ),
        ),
      )
      .returning({ id: customFields.id });
    return deleted.length > 0;
  }

  async listTaskValues(workspaceId: string, taskId: string): Promise<CustomFieldValueRow[]> {
    return this.db
      .select({ value: taskCustomFieldValues })
      .from(taskCustomFieldValues)
      .innerJoin(tasks, eq(tasks.id, taskCustomFieldValues.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(projects.workspaceId, workspaceId), eq(tasks.id, taskId)))
      .then((rows) => rows.map((row) => row.value));
  }

  /** Valores de todas as tarefas do projeto, com escopo de workspace. */
  async listProjectValues(workspaceId: string, projectId: string): Promise<CustomFieldValueRow[]> {
    return this.db
      .select({ value: taskCustomFieldValues })
      .from(taskCustomFieldValues)
      .innerJoin(tasks, eq(tasks.id, taskCustomFieldValues.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(projects.workspaceId, workspaceId), eq(tasks.projectId, projectId)))
      .then((rows) => rows.map((row) => row.value));
  }

  async listValuesForField(workspaceId: string, fieldId: string): Promise<CustomFieldValueRow[]> {
    return this.db
      .select({ value: taskCustomFieldValues })
      .from(taskCustomFieldValues)
      .innerJoin(tasks, eq(tasks.id, taskCustomFieldValues.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(projects.workspaceId, workspaceId), eq(taskCustomFieldValues.fieldId, fieldId)))
      .then((rows) => rows.map((row) => row.value));
  }

  async upsertTaskValues(
    taskId: string,
    values: { fieldId: string; value: string | number | boolean | null }[],
  ): Promise<void> {
    if (!values.length) return;
    await this.db
      .insert(taskCustomFieldValues)
      .values(values.map(({ fieldId, value }) => ({ taskId, fieldId, value })))
      .onConflictDoUpdate({
        target: [taskCustomFieldValues.taskId, taskCustomFieldValues.fieldId],
        set: { value: sql`excluded.value` },
      });
  }
}
