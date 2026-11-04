import { NotFoundException } from '@nestjs/common';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, ValidationError } from '@/core/errors';
import { toErrorBody } from './all-exceptions.filter';

describe('toErrorBody', () => {
  it('converte NotFoundError em 404 NOT_FOUND com o recurso na mensagem', () => {
    expect(toErrorBody(new NotFoundError('Task', 't1'))).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: 'Task t1 não encontrado(a)',
    });
  });

  it('mantém os detalhes de ValidationError', () => {
    const details = [{ path: ['title'], message: 'obrigatório' }];
    expect(toErrorBody(new ValidationError('Dados inválidos', details))).toMatchObject({ statusCode: 422, details });
  });

  it.each([
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new ConflictError('já existe'), 409, 'CONFLICT'],
    [new DomainError('ciclo', 'CIRCULAR_DEPENDENCY'), 400, 'CIRCULAR_DEPENDENCY'],
  ])('mapeia %p para %i %s', (err, status, code) => {
    expect(toErrorBody(err)).toMatchObject({ statusCode: status, error: code });
  });

  it('converte HttpException do Nest (ex.: rota inexistente)', () => {
    expect(toErrorBody(new NotFoundException('Cannot GET /x'))).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: 'Cannot GET /x',
    });
  });

  it('esconde a mensagem de erros inesperados', () => {
    const body = toErrorBody(new Error('senha do banco: 123'));
    expect(body).toEqual({ statusCode: 500, error: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente.' });
  });
});
