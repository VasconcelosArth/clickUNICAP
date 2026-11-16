import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SessionResponse,
  UpdateProfileInput,
  User,
} from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const authApi = {
  login: (input: LoginInput) => api.post<SessionResponse>('/auth/login', input),
  register: (input: RegisterInput) => api.post<SessionResponse>('/auth/register', input),
  forgotPassword: (input: ForgotPasswordInput) => api.post<void>('/auth/forgot-password', input),
  resetPassword: (input: ResetPasswordInput) => api.post<void>('/auth/reset-password', input),
  updateProfile: (input: UpdateProfileInput) => api.patch<User>('/users/me', input),
};
