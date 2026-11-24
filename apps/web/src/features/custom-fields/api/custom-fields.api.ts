import type {
  CreateCustomFieldInput,
  CustomField,
  UpdateCustomFieldInput,
  UpdateTaskCustomFieldValuesInput,
} from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export type CustomFieldValues = Record<string, string | number | boolean | null>;

export const customFieldsApi = {
  listForProject: (projectId: string) => api.get<CustomField[]>(`/projects/${projectId}/custom-fields`),
  create: (projectId: string, input: CreateCustomFieldInput) =>
    api.post<CustomField>(`/projects/${projectId}/custom-fields`, input),
  update: (fieldId: string, input: UpdateCustomFieldInput) =>
    api.patch<CustomField>(`/custom-fields/${fieldId}`, input),
  remove: (fieldId: string) => api.delete(`/custom-fields/${fieldId}`),
  getTaskValues: (taskId: string) => api.get<CustomFieldValues>(`/tasks/${taskId}/custom-field-values`),
  updateTaskValues: (taskId: string, input: UpdateTaskCustomFieldValuesInput) =>
    api.patch<CustomFieldValues>(`/tasks/${taskId}/custom-field-values`, input),
};
