import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common.schema';

/** Usuário como a API devolve (nunca inclui senha ou hash). */
export const userSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(120),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  createdAt: dateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

/** Resposta de cadastro, login e refresh. Os tokens vão só nos cookies. */
export const sessionResponseSchema = z.object({ user: userSchema });
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres')
  .max(128, 'A senha pode ter no máximo 128 caracteres');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = loginSchema.pick({ email: true });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({ token: z.string().min(1), password: passwordSchema });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z
  .object({ name: z.string().trim().min(1).max(120), avatarUrl: z.string().url().nullable() })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
