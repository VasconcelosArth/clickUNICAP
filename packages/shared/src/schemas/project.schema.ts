import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common.schema';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB');

export const projectSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(2000).nullable(),
  color: hexColorSchema.nullable(),
  archivedAt: dateTimeSchema.nullable(),
  createdBy: idSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(80),
  description: z.string().max(2000).nullable().optional(),
  color: hexColorSchema.nullable().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** GET /api/projects?includeArchived=true */
export const listProjectsQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
