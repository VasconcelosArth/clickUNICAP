import { http, HttpResponse } from 'msw';
import { ids, user } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { api, ApiError, onSessionExpired } from './api-client';

const unauthorized = () =>
  HttpResponse.json({ statusCode: 401, error: 'Unauthorized', message: 'Sessão inválida' }, { status: 401 });

describe('cliente HTTP', () => {
  it('envia o workspace ativo no header', async () => {
    let header: string | null = null;
    server.use(
      http.get('*/coisas', ({ request }) => {
        header = request.headers.get('X-Workspace-Id');
        return HttpResponse.json([]);
      }),
    );
    useWorkspaceStore.setState({ activeWorkspaceId: ids.workspace });

    await api.get('/coisas');

    expect(header).toBe(ids.workspace);
  });

  it('monta a query string e ignora filtros vazios', async () => {
    let search = '';
    server.use(
      http.get('*/coisas', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await api.get('/coisas', { priority: ['high', 'urgent'], search: undefined });

    expect(search).toBe('?priority=high%2Curgent');
  });

  it('converte a resposta de erro da API em ApiError', async () => {
    server.use(
      http.get('*/coisas', () =>
        HttpResponse.json({ statusCode: 409, error: 'Conflict', message: 'Já existe' }, { status: 409 }),
      ),
    );

    const error = await api.get('/coisas').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 409, message: 'Já existe' });
  });

  it('renova a sessão no 401 e repete a requisição', async () => {
    let calls = 0;
    server.use(
      http.get('*/coisas', () => (++calls === 1 ? unauthorized() : HttpResponse.json({ ok: true }))),
      http.post('*/auth/refresh', () => HttpResponse.json({ user })),
    );

    await expect(api.get('/coisas')).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('avisa que a sessão acabou quando a renovação falha', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    server.use(http.get('*/coisas', unauthorized), http.post('*/auth/refresh', unauthorized));

    await expect(api.get('/coisas')).rejects.toMatchObject({ statusCode: 401 });

    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('não tenta renovar a sessão nas rotas de autenticação', async () => {
    let refreshed = false;
    server.use(
      http.post('*/auth/login', unauthorized),
      http.post('*/auth/refresh', () => {
        refreshed = true;
        return HttpResponse.json({ user });
      }),
    );

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({ message: 'Sessão inválida' });
    expect(refreshed).toBe(false);
  });

  it('envia o arquivo com o workspace no header e avisa o progresso no fim', async () => {
    // O MSW não lê o FormData do jsdom enviado por XMLHttpRequest: o teste confere a rota e o header
    let header: string | null = null;
    server.use(
      http.post('*/arquivos', ({ request }) => {
        header = request.headers.get('X-Workspace-Id');
        return HttpResponse.json({ id: 'a1' }, { status: 201 });
      }),
    );
    useWorkspaceStore.setState({ activeWorkspaceId: ids.workspace });
    const form = new FormData();
    form.append('file', new File(['oi'], 'nota.txt', { type: 'text/plain' }));
    const onProgress = vi.fn();

    await expect(api.upload('/arquivos', form, { onProgress })).resolves.toEqual({ id: 'a1' });

    expect(header).toBe(ids.workspace);
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it('converte o erro do upload em ApiError', async () => {
    server.use(
      http.post('*/arquivos', () =>
        HttpResponse.json(
          { statusCode: 422, error: 'FILE_TOO_LARGE', message: 'O arquivo passa do limite de 10 MB' },
          { status: 422 },
        ),
      ),
    );

    const error = await api.upload('/arquivos', new FormData()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 422, error: 'FILE_TOO_LARGE' });
  });

  it('renova a sessão no 401 do upload e repete o envio', async () => {
    let calls = 0;
    server.use(
      http.post('*/arquivos', () => (++calls === 1 ? unauthorized() : HttpResponse.json({ ok: true }))),
      http.post('*/auth/refresh', () => HttpResponse.json({ user })),
    );

    await expect(api.upload('/arquivos', new FormData())).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('baixa um arquivo como Blob e converte o erro em ApiError', async () => {
    server.use(
      http.get('*/arquivos/1', () => new HttpResponse('conteúdo', { headers: { 'Content-Type': 'text/plain' } })),
      http.get('*/arquivos/2', () =>
        HttpResponse.json({ statusCode: 404, error: 'NOT_FOUND', message: 'Anexo não encontrado' }, { status: 404 }),
      ),
    );

    const blob = await api.getBlob('/arquivos/1');
    expect(blob.size).toBe(new TextEncoder().encode('conteúdo').length);
    expect(blob.type).toMatch(/^text\/plain/);
    await expect(api.getBlob('/arquivos/2')).rejects.toMatchObject({ statusCode: 404 });
  });
});
