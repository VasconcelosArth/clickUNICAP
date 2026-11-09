import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

const MAX_RETRIES = 2;

/** Erro 4xx é definitivo: repetir a requisição não muda a resposta. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false, staleTime: 30_000 },
    },
  });
}
