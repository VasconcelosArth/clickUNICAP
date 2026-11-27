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

function apiErrorFromBody(status: number, body: unknown): ApiError {
  const parsed = apiErrorSchema.safeParse(body);
  if (parsed.success) {
    const { statusCode, error, message, details } = parsed.data;
    return new ApiError(statusCode, error, message, details);
  }
  return new ApiError(status, 'UnknownError', 'Não foi possível concluir a operação.');
}

async function toApiError(response: Response): Promise<ApiError> {
  return apiErrorFromBody(response.status, await response.json().catch(() => null));
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

/** 401 fora das rotas de autenticação: tenta renovar uma vez; devolve true se vale repetir a requisição. */
async function shouldRetryAfter401(status: number, path: string, isRetry: boolean): Promise<boolean> {
  // Nas rotas de autenticação, 401 é resposta de negócio (senha errada), não sessão vencida
  if (status !== 401 || path.startsWith('/auth/')) return false;
  if (!isRetry && (await refreshSession())) return true;
  sessionExpiredListeners.forEach((listener) => listener());
  return false;
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

  if (await shouldRetryAfter401(response.status, path, isRetry)) return request<T>(method, path, options, true);

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Baixa um arquivo como Blob (download e preview de anexos). */
async function requestBlob(path: string, isRetry = false): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, undefined), {
      method: 'GET',
      credentials: 'include',
      headers: buildHeaders(false),
    });
  } catch {
    throw new ApiError(0, 'NetworkError', 'Não foi possível conectar ao servidor.');
  }
  if (await shouldRetryAfter401(response.status, path, isRetry)) return requestBlob(path, true);
  if (!response.ok) throw await toApiError(response);
  return response.blob();
}

export interface UploadOptions {
  /** Fração enviada, de 0 a 1. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** O fetch não informa o progresso do envio: o upload usa XMLHttpRequest, com as mesmas regras do request. */
function sendForm(path: string, form: FormData, options: UploadOptions): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildUrl(path, undefined));
    xhr.withCredentials = true;
    Object.entries(buildHeaders(false)).forEach(([name, value]) => xhr.setRequestHeader(name, String(value)));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) options.onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new ApiError(0, 'NetworkError', 'Não foi possível conectar ao servidor.'));
    xhr.onabort = () => reject(new ApiError(0, 'AbortError', 'Envio cancelado.'));
    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function upload<T>(path: string, form: FormData, options: UploadOptions, isRetry = false): Promise<T> {
  const { status, text } = await sendForm(path, form, options);
  if (await shouldRetryAfter401(status, path, isRetry)) return upload<T>(path, form, options, true);
  if (status < 200 || status >= 300) throw apiErrorFromBody(status, parseJson(text));
  options.onProgress?.(1);
  return parseJson(text) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path, {}),
  /** `multipart/form-data`, com progresso do envio. */
  upload: <T>(path: string, form: FormData, options: UploadOptions = {}) => upload<T>(path, form, options),
  getBlob: (path: string) => requestBlob(path),
};
