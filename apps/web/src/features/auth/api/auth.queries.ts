import type { SessionResponse } from '@clickunicap/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { currentUserKey } from '@/hooks/useCurrentUser';
import { authApi } from './auth.api';

function useStoreSession() {
  const queryClient = useQueryClient();
  return (session: SessionResponse) => queryClient.setQueryData(currentUserKey, session.user);
}

export function useLogin() {
  const storeSession = useStoreSession();
  return useMutation({ mutationFn: authApi.login, onSuccess: storeSession });
}

export function useRegister() {
  const storeSession = useStoreSession();
  return useMutation({ mutationFn: authApi.register, onSuccess: storeSession });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (user) => queryClient.setQueryData(currentUserKey, user),
  });
}
