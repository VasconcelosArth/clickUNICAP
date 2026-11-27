import type { CreateCustomFieldInput, UpdateCustomFieldInput } from '@clickunicap/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFieldsApi, type CustomFieldValues } from './custom-fields.api';
import { customFieldKeys, projectDetailKey } from './custom-fields.keys';

export function useProjectCustomFields(projectId: string) {
  return useQuery({
    queryKey: customFieldKeys.project(projectId),
    queryFn: () => customFieldsApi.listForProject(projectId),
    enabled: !!projectId,
  });
}

/** Valores de todas as tarefas do projeto, para as colunas da Lista. */
export function useProjectCustomFieldValues(projectId: string) {
  return useQuery({
    queryKey: customFieldKeys.projectValues(projectId),
    queryFn: () => customFieldsApi.listProjectValues(projectId),
    enabled: !!projectId,
  });
}

/** O projeto arquivado é somente leitura: o painel desabilita os controles. */
export function useProjectArchived(projectId: string) {
  const query = useQuery({
    queryKey: projectDetailKey(projectId),
    queryFn: () => customFieldsApi.getProject(projectId),
    enabled: !!projectId,
  });
  return !!query.data?.archivedAt;
}

export function useTaskCustomFieldValues(taskId: string) {
  return useQuery({
    queryKey: customFieldKeys.taskValues(taskId),
    queryFn: () => customFieldsApi.getTaskValues(taskId),
    enabled: !!taskId,
  });
}

export function useCreateCustomField(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomFieldInput) => customFieldsApi.create(projectId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customFieldKeys.project(projectId) }),
  });
}

export function useUpdateCustomField(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fieldId, input }: { fieldId: string; input: UpdateCustomFieldInput }) =>
      customFieldsApi.update(fieldId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customFieldKeys.project(projectId) }),
  });
}

export function useDeleteCustomField(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customFieldsApi.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customFieldKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: customFieldKeys.projectValues(projectId) });
    },
  });
}

export function useUpdateTaskCustomFieldValues(taskId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CustomFieldValues) => customFieldsApi.updateTaskValues(taskId, { values }),
    onSuccess: (values) => {
      queryClient.setQueryData(customFieldKeys.taskValues(taskId), values);
      void queryClient.invalidateQueries({ queryKey: customFieldKeys.projectValues(projectId) });
    },
  });
}
