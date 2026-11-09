import type { CreateProjectInput, Project } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const projectsApi = {
  list: (includeArchived: boolean) =>
    api.get<Project[]>('/projects', { includeArchived: includeArchived ? 'true' : undefined }),
  get: (projectId: string) => api.get<Project>(`/projects/${projectId}`),
  create: (input: CreateProjectInput) => api.post<Project>('/projects', input),
  archive: (projectId: string) => api.post<Project>(`/projects/${projectId}/archive`),
  unarchive: (projectId: string) => api.post<Project>(`/projects/${projectId}/unarchive`),
};
