import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { clearSession } from './useCurrentUser';

/** Encerra a sessão. Sem usuário, o RequireAuth leva para o login. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSuccess: () => clearSession(queryClient),
  });
}
