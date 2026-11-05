import { createTaskSchema } from '@clickunicap/shared';
import { z } from 'zod';
import { ValidationError } from '@/core/errors';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(createTaskSchema);

  it('devolve o valor já transformado pelo schema', () => {
    expect(pipe.transform({ title: '  Tarefa  ' })).toEqual({ title: 'Tarefa' });
  });

  it('recusa caractere nulo em qualquer nível do valor', () => {
    expect(() => pipe.transform({ title: 'a\u0000b' })).toThrow(ValidationError);
    const nested = new ZodValidationPipe(z.object({ tags: z.array(z.object({ name: z.string() })) }));
    expect(() => nested.transform({ tags: [{ name: 'a\u0000b' }] })).toThrow(ValidationError);
    expect(nested.transform({ tags: [{ name: 'ab' }] })).toEqual({ tags: [{ name: 'ab' }] });
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
