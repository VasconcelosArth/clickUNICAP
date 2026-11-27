import type {
  CreateCustomFieldInput,
  CustomField,
  Project,
  ProjectCustomFieldValues,
  UpdateCustomFieldInput,
  UpdateTaskCustomFieldValuesInput,
} from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export type CustomFieldValue = string | number | boolean | null;
export type CustomFieldValues = Record<string, CustomFieldValue>;

export const customFieldsApi = {
  listForProject: (projectId: string) => api.get<CustomField[]>(`/projects/${projectId}/custom-fields`),
  listProjectValues: (projectId: string) =>
    api.get<ProjectCustomFieldValues>(`/projects/${projectId}/custom-field-values`),
  create: (projectId: string, input: CreateCustomFieldInput) =>
    api.post<CustomField>(`/projects/${projectId}/custom-fields`, input),
  update: (fieldId: string, input: UpdateCustomFieldInput) =>
    api.patch<CustomField>(`/custom-fields/${fieldId}`, input),
  remove: (fieldId: string) => api.delete(`/custom-fields/${fieldId}`),
  getTaskValues: (taskId: string) => api.get<CustomFieldValues>(`/tasks/${taskId}/custom-field-values`),
  updateTaskValues: (taskId: string, input: UpdateTaskCustomFieldValuesInput) =>
    api.patch<CustomFieldValues>(`/tasks/${taskId}/custom-field-values`, input),
  /** Só para saber se o projeto está arquivado; ver `useProjectArchived`. */
  getProject: (projectId: string) => api.get<Project>(`/projects/${projectId}`),
};
