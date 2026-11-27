import { z } from 'zod';
import { CUSTOM_FIELD_TYPES } from '../enums';
import { dateTimeSchema, dateOnlySchema, idSchema } from './common.schema';

export const customFieldTypeSchema = z.enum(CUSTOM_FIELD_TYPES);
export const customFieldValueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);

export const customFieldSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  name: z.string().min(1).max(80),
  type: customFieldTypeSchema,
  options: z.array(z.string()).nullable(),
  isRequired: z.boolean(),
  position: z.number().finite().min(0),
  createdAt: dateTimeSchema,
});
export type CustomField = z.infer<typeof customFieldSchema>;

const fieldInputShape = {
  name: z.string().trim().min(1, 'Informe o nome do campo').max(80),
  type: customFieldTypeSchema,
  options: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  isRequired: z.boolean().default(false),
  position: z.number().finite().min(0).optional(),
};

export const createCustomFieldSchema = z.object(fieldInputShape).superRefine((input, ctx) => {
  if (input.type === 'dropdown' && (!input.options || input.options.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Dropdown precisa ter pelo menos uma opção',
      path: ['options'],
    });
  }
  if (input.options && new Set(input.options).size !== input.options.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'As opções não podem se repetir', path: ['options'] });
  }
  if (input.type !== 'dropdown' && input.options?.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Opções só são permitidas em dropdown', path: ['options'] });
  }
});
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;

/** O tipo do campo é imutável depois da criação; evita invalidar valores já salvos. */
export const updateCustomFieldSchema = z
  .object({
    name: fieldInputShape.name.optional(),
    options: z.array(z.string().trim().min(1).max(100)).min(1).max(100).optional(),
    isRequired: z.boolean().optional(),
    position: fieldInputShape.position,
  })
  .superRefine((input, ctx) => {
    if (input.options && new Set(input.options).size !== input.options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'As opções não podem se repetir', path: ['options'] });
    }
  });
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;

export const taskCustomFieldValuesSchema = z.record(idSchema, customFieldValueSchema);
export type TaskCustomFieldValues = z.infer<typeof taskCustomFieldValuesSchema>;

/** Valores de todas as tarefas de um projeto, por tarefa: `{ taskId: { fieldId: value } }`. Usado pela Lista. */
export const projectCustomFieldValuesSchema = z.record(idSchema, taskCustomFieldValuesSchema);
export type ProjectCustomFieldValues = z.infer<typeof projectCustomFieldValuesSchema>;
export const updateTaskCustomFieldValuesSchema = z.object({ values: taskCustomFieldValuesSchema });
export type UpdateTaskCustomFieldValuesInput = z.infer<typeof updateTaskCustomFieldValuesSchema>;

/** Reexport para a regra de validação de valores por tipo. */
export const customFieldDateValueSchema = dateOnlySchema;
