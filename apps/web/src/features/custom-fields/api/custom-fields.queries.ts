import type { CreateCustomFieldInput, UpdateCustomFieldInput } from '@clickunicap/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFieldsApi } from './custom-fields.api';
import { customFieldKeys } from './custom-fields.keys';

export function useProjectCustomFields(projectId: string) {
  return useQuery({
    queryKey: customFieldKeys.project(projectId),
    queryFn: () => customFieldsApi.listForProject(projectId),
    enabled: !!projectId,
  });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customFieldKeys.project(projectId) }),
  });
}

export function useUpdateTaskCustomFieldValues(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, string | number | boolean | null>) =>
      customFieldsApi.updateTaskValues(taskId, { values }),
    onSuccess: (values) => queryClient.setQueryData(customFieldKeys.taskValues(taskId), values),
  });
}
