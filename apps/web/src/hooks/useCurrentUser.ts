import type { User } from '@clickunicap/shared';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';

export const currentUserKey = ['current-user'] as const;

async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await api.get<User>('/users/me');
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) return null;
    throw error;
  }
}

/** Usuário logado. `null` significa que não há sessão. */
export function useCurrentUser() {
  return useQuery({ queryKey: currentUserKey, queryFn: fetchCurrentUser, staleTime: 5 * 60_000 });
}

/** Apaga os dados da sessão anterior, para o próximo usuário não ver nada dela. */
export function clearSession(queryClient: QueryClient): void {
  useWorkspaceStore.getState().setActiveWorkspace(null);
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== currentUserKey[0] });
  queryClient.setQueryData(currentUserKey, null);
}
