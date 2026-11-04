import { z } from 'zod';

/**
 * Variáveis de ambiente da API. Validadas na subida: se faltar algo, a API não sobe
 * e diz exatamente o que falta. Nunca leia process.env fora de core/config.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url({ message: 'DATABASE_URL precisa ser uma URL postgres://...' }),
    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET precisa ter pelo menos 16 caracteres'),
    JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET precisa ter pelo menos 16 caracteres'),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    /** Endereço do frontend, usado nos links dos e-mails (ex.: recuperação de senha). */
    WEB_URL: z.string().url().default('http://localhost:5173'),

    /** log = e-mails só aparecem no log da API (dev). resend = envio real pelo Resend. */
    MAIL_TRANSPORT: z.enum(['log', 'resend']).default('log'),
    MAIL_FROM: z.string().min(3).default('ClickUNICAP <onboarding@resend.dev>'),
    RESEND_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.MAIL_TRANSPORT === 'resend' && !env.RESEND_API_KEY?.startsWith('re_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['RESEND_API_KEY'],
        message: 'Obrigatória quando MAIL_TRANSPORT=resend (começa com "re_"). Crie em https://resend.com/api-keys',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Valida o ambiente e lança um erro legível listando todas as variáveis com problema. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  // Variáveis vazias no .env (ex.: RESEND_API_KEY=) contam como ausentes.
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuração inválida no .env:\n${problems}`);
  }
  return result.data;
}
