import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, max, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { customFields, projects, taskCustomFieldValues, tasks } from '@/core/database/schema';

export type CustomFieldRow = typeof customFields.$inferSelect;
export type NewCustomFieldRow = typeof customFields.$inferInsert;
export type CustomFieldValueRow = typeof taskCustomFieldValues.$inferSelect;

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

  async maxPosition(workspaceId: string, projectId: string): Promise<number | null> {
    const [row] = await this.db
      .select({ value: max(customFields.position) })
      .from(customFields)
      .innerJoin(projects, eq(projects.id, customFields.projectId))
      .where(and(eq(projects.workspaceId, workspaceId), eq(customFields.projectId, projectId)));
    return row?.value ?? null;
  }

  async insert(data: NewCustomFieldRow): Promise<CustomFieldRow> {
    const [row] = await this.db.insert(customFields).values(data).returning();
    if (!row) throw new Error('Falha ao criar campo personalizado');
    return row;
  }

  async update(
    workspaceId: string,
    fieldId: string,
    data: Partial<Pick<NewCustomFieldRow, 'name' | 'options' | 'isRequired' | 'position'>>,
  ): Promise<CustomFieldRow | undefined> {
    const [row] = await this.db
      .update(customFields)
      .set(data)
      .where(
        and(
          eq(customFields.id, fieldId),
          inArray(
            customFields.projectId,
            this.db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId)),
          ),
        ),
      )
      .returning();
    return row;
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
