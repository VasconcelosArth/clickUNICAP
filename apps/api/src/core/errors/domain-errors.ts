/**
 * Erros de domínio. Services lançam ESTES erros (nunca HttpException).
 * O AllExceptionsFilter converte cada um no status HTTP e no formato padrão.
 * Tabela completa em docs/04-backend-guia.md#erros.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    /** Código estável em UPPER_SNAKE que o frontend pode usar, ex.: CIRCULAR_DEPENDENCY */
    readonly code: string = 'DOMAIN_ERROR',
    readonly statusCode: number = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Dados inválidos', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = 'Faça login para continuar') {
    super(message, 'UNAUTHENTICATED', 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Você não tem permissão para esta ação') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends DomainError {
  /** @example throw new NotFoundError('Task', taskId) */
  constructor(resource: string, id?: string) {
    super(id ? `${resource} ${id} não encontrado(a)` : `${resource} não encontrado(a)`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, code, 409);
  }
}
