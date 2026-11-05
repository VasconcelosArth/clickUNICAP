import { z } from 'zod';

/** UUID v4 usado como id em todas as entidades. */
export const idSchema = z.string().uuid();

/** Data e hora em ISO 8601 UTC, ex.: "2026-11-04T18:30:00.000Z". */
export const dateTimeSchema = z.string().datetime();

const DATE_ONLY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/** O ano 0000 não existe no Postgres. O Date ajusta 31/02 para março, por isso a comparação com o texto original. */
const isRealDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !value.startsWith('0000') && !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
};

/** Data sem hora, ex.: "2026-11-20". Usada em prazos e datas de início. */
export const dateOnlySchema = z
  .string()
  .regex(DATE_ONLY_FORMAT, 'Use o formato AAAA-MM-DD')
  .refine((value) => !DATE_ONLY_FORMAT.test(value) || isRealDate(value), 'Esta data não existe');

/** Parâmetros de paginação por cursor (listas grandes). */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: idSchema.optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Formato da resposta paginada. */
export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ data: z.array(item), nextCursor: idSchema.nullable() });

/** Formato padrão de erro devolvido pela API (ver docs/04-backend-guia.md#erros). */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
