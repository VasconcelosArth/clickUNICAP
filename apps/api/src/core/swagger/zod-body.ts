import { Body } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';

/** Valida o body com o schema e publica o mesmo schema no Swagger: `@ZodBody(createTaskSchema) body: CreateTaskInput` */
export function ZodBody(schema: ZodTypeAny): ParameterDecorator {
  return (target, key, index) => {
    Body(new ZodValidationPipe(schema))(target, key, index);
    if (!key) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor) return;
    const jsonSchema = (zodToJsonSchema as (s: unknown, o: object) => object)(schema, {
      $refStrategy: 'none',
      target: 'openApi3',
    });
    ApiBody({ schema: jsonSchema })(target, key, descriptor);
  };
}
