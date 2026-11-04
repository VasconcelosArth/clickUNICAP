import { PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';
import { ValidationError } from '@/core/errors';

/**
 * Valida body/query com um schema do @clickunicap/shared.
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
    return result.data;
  }
}
