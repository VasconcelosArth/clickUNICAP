import { Body } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';

function toJsonSchema(schema: ZodTypeAny): object {
  return (zodToJsonSchema as (s: unknown, o: object) => object)(schema, { $refStrategy: 'none', target: 'openApi3' });
}

/** Valida o body com o schema e publica o mesmo schema no Swagger: `@ZodBody(createTaskSchema) body: CreateTaskInput` */
export function ZodBody(schema: ZodTypeAny): ParameterDecorator {
  return (target, key, index) => {
    Body(new ZodValidationPipe(schema))(target, key, index);
    if (!key) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (!descriptor) return;
    ApiBody({ schema: toJsonSchema(schema) })(target, key, descriptor);
  };
}

/** Publica no Swagger o formato da resposta: `@ZodResponse(taskSchema)` ou `@ZodResponse(taskSchema, 201)`. Rotas 204 não usam. */
export function ZodResponse(schema: ZodTypeAny, status = 200): MethodDecorator {
  return ApiResponse({ status, schema: toJsonSchema(schema) });
}
