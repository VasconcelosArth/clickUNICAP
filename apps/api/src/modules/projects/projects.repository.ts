import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { projects } from '@/core/database/schema';

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;

/** Toda operação é filtrada pelo workspace. */
@Injectable()
export class ProjectsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async insert(data: NewProjectRow): Promise<ProjectRow> {
    const [row] = await this.db.insert(projects).values(data).returning();
    if (!row) throw new Error('Falha ao criar projeto');
    return row;
  }

  list(workspaceId: string, includeArchived: boolean): Promise<ProjectRow[]> {
    const scope = eq(projects.workspaceId, workspaceId);
    return this.db
      .select()
      .from(projects)
      .where(includeArchived ? scope : and(scope, isNull(projects.archivedAt)))
      .orderBy(asc(projects.name));
  }

  async findById(workspaceId: string, id: string): Promise<ProjectRow | undefined> {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.id, id)))
      .limit(1);
    return row;
  }

  async update(
    workspaceId: string,
    id: string,
    data: Partial<Pick<NewProjectRow, 'name' | 'description' | 'color' | 'archivedAt'>>,
  ): Promise<ProjectRow | undefined> {
    const [row] = await this.db
      .update(projects)
      .set(data)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.id, id)))
      .returning();
    return row;
  }
}
