import { apiErrorSchema } from '@clickunicap/shared';
import { useWorkspaceStore } from '@/stores/workspace.store';

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api';

type QueryValue = string | string[] | undefined;

interface RequestOptions {
  body?: unknown;
  query?: Record<string, QueryValue>;
}

/** Erro padrão da API (ver docs/04-backend-guia.md#erros). */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly error: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** Avisa quando a sessão acabou e não deu para renovar. Devolve a função que cancela a inscrição. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    const text = Array.isArray(value) ? value.join(',') : value;
    if (text) params.set(key, text);
  });
  const search = params.toString();
  return `${BASE_URL}${path}${search ? `?${search}` : ''}`;
}

function buildHeaders(hasBody: boolean): HeadersInit {
  const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
  };
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  if (parsed.success) {
    const { statusCode, error, message, details } = parsed.data;
    return new ApiError(statusCode, error, message, details);
  }
  return new ApiError(response.status, 'UnknownError', 'Não foi possível concluir a operação.');
}

let refreshing: Promise<boolean> | null = null;

/** Várias requisições podem receber 401 juntas: todas esperam a mesma renovação. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    // 409: outra aba acabou de renovar, e os cookies novos já valem aqui também
    .then((response) => response.ok || response.status === 409)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request<T>(method: string, path: string, options: RequestOptions, isRetry = false): Promise<T> {
  const hasBody = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      credentials: 'include',
      headers: buildHeaders(hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NetworkError', 'Não foi possível conectar ao servidor.');
  }

  // Nas rotas de autenticação, 401 é resposta de negócio (senha errada), não sessão vencida
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (!isRetry && (await refreshSession())) return request<T>(method, path, options, true);
    sessionExpiredListeners.forEach((listener) => listener());
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path, {}),
};
