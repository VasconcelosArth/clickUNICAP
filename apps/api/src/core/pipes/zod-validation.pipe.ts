import { PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';
import { ValidationError } from '@/core/errors';

function hasNullCharacter(value: unknown): boolean {
  if (typeof value === 'string') return value.includes('\u0000');
  if (Array.isArray(value)) return value.some(hasNullCharacter);
  if (value !== null && typeof value === 'object') return Object.values(value).some(hasNullCharacter);
  return false;
}

/**
 * Valida body/query com um schema do @clickunicap/shared.
 * Também recusa texto com caractere nulo, que o Postgres não aceita (viraria erro 500).
 * @example @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput
 */
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path, message: i.message }));
      throw new ValidationError('Dados inválidos', details);
    }
    if (hasNullCharacter(result.data)) throw new ValidationError('O texto contém um caractere inválido');
    return result.data;
  }
}
