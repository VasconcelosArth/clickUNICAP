import { createTaskSchema } from '@clickunicap/shared';
import { ValidationError } from '@/core/errors';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(createTaskSchema);

  it('devolve o valor já transformado pelo schema', () => {
    expect(pipe.transform({ title: '  Tarefa  ' })).toEqual({ title: 'Tarefa' });
  });

  it('lança ValidationError com os campos inválidos', () => {
    try {
      pipe.transform({ title: '', priority: 'xpto' });
      fail('deveria ter lançado');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const details = (e as ValidationError).details as { path: string[] }[];
      expect(details.map((d) => d.path[0])).toEqual(expect.arrayContaining(['title', 'priority']));
    }
  });
});
