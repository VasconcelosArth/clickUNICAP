import type { Subtask } from '@clickunicap/shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { subtaskFixture } from '../mocks/subtasks.handlers';
import { SubtasksPanel } from './SubtasksPanel';

const first: Subtask = { ...subtaskFixture, isDone: true };
const second: Subtask = {
  ...subtaskFixture,
  id: '88888888-8888-4888-8888-888888888888',
  title: 'Ligar a API',
  position: 2,
};

function renderPanel() {
  return renderWithProviders(<SubtasksPanel taskId={ids.task} projectId={ids.project} />);
}

/** Simula a API com estado e devolve o que ela recebeu. */
function serveSubtasks(initial: Subtask[]) {
  let list = initial;
  const posts: unknown[] = [];
  const patches: unknown[] = [];
  const deleted: string[] = [];
  let release: () => void = () => undefined;
  const hold = { enabled: false };
  server.use(
    http.get('*/tasks/:taskId/subtasks', () => HttpResponse.json(list)),
    http.post('*/tasks/:taskId/subtasks', async ({ request }) => {
      const body = (await request.json()) as { title: string };
      posts.push(body);
      const created = { ...subtaskFixture, id: crypto.randomUUID(), title: body.title, isDone: false, position: 99 };
      list = [...list, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch('*/subtasks/:id', async ({ params, request }) => {
      const body = (await request.json()) as Partial<Subtask>;
      patches.push(body);
      if (hold.enabled) await new Promise<void>((resolve) => (release = resolve));
      list = list.map((subtask) => (subtask.id === params.id ? { ...subtask, ...body } : subtask));
      return HttpResponse.json(list.find((subtask) => subtask.id === params.id));
    }),
    http.delete('*/subtasks/:id', ({ params }) => {
      deleted.push(String(params.id));
      list = list.filter((subtask) => subtask.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { posts, patches, deleted, hold, release: () => release() };
}

describe('SubtasksPanel', () => {
  it('mostra o estado vazio', async () => {
    renderPanel();

    expect(await screen.findByText('Nenhuma subtarefa ainda.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('mostra o erro da listagem', async () => {
    server.use(
      http.get('*/tasks/:taskId/subtasks', () =>
        HttpResponse.json({ statusCode: 404, error: 'NOT_FOUND', message: 'Tarefa não encontrada' }, { status: 404 }),
      ),
    );

    renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent('Tarefa não encontrada');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('lista as subtarefas com o progresso', async () => {
    serveSubtasks([first, second]);
    renderPanel();

    expect(await screen.findByText('1/2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso das subtarefas' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('checkbox', { name: first.title })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: second.title })).not.toBeChecked();
  });

  it('marca o checkbox na hora, antes de a API responder', async () => {
    const api = serveSubtasks([first, second]);
    api.hold.enabled = true;
    const user = userEvent.setup();
    renderPanel();

    const checkbox = await screen.findByRole('checkbox', { name: second.title });
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByText('2/2')).toBeInTheDocument();
    await waitFor(() => expect(api.patches).toEqual([{ isDone: true }]));

    api.release();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: second.title })).toBeChecked());
  });

  it('desfaz o checkbox quando a API recusa', async () => {
    serveSubtasks([second]);
    server.use(
      http.patch('*/subtasks/:id', () =>
        HttpResponse.json(
          { statusCode: 409, error: 'PROJECT_ARCHIVED', message: 'Este projeto está arquivado' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    const checkbox = await screen.findByRole('checkbox', { name: second.title });
    await user.click(checkbox);

    expect(await screen.findByRole('alert')).toHaveTextContent('Este projeto está arquivado');
    expect(checkbox).not.toBeChecked();
  });

  it('adiciona uma subtarefa e limpa o campo', async () => {
    const api = serveSubtasks([]);
    const user = userEvent.setup();
    renderPanel();

    const input = await screen.findByLabelText('Nova subtarefa');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    await user.type(input, '  Escrever testes {Enter}');

    await waitFor(() => expect(api.posts).toEqual([{ title: 'Escrever testes' }]));
    expect(await screen.findByRole('checkbox', { name: 'Escrever testes' })).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('adiciona pelo botão', async () => {
    const api = serveSubtasks([]);
    const user = userEvent.setup();
    renderPanel();

    await user.type(await screen.findByLabelText('Nova subtarefa'), 'Revisar PR');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(api.posts).toEqual([{ title: 'Revisar PR' }]));
  });

  it('não envia título só com espaços (validação do schema) e marca o campo', async () => {
    const api = serveSubtasks([]);
    const user = userEvent.setup();
    renderPanel();

    const input = await screen.findByLabelText('Nova subtarefa');
    await user.type(input, '   {Enter}');

    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(api.posts).toEqual([]);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
  });

  it('mostra o erro da API ao adicionar e mantém o texto', async () => {
    server.use(
      http.get('*/tasks/:taskId/subtasks', () => HttpResponse.json([])),
      http.post('*/tasks/:taskId/subtasks', () =>
        HttpResponse.json(
          { statusCode: 409, error: 'PROJECT_ARCHIVED', message: 'Projeto arquivado é somente leitura' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    const input = await screen.findByLabelText('Nova subtarefa');
    await user.type(input, 'Algo{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Projeto arquivado é somente leitura');
    expect(input).toHaveValue('Algo');
  });

  it('renomeia a subtarefa', async () => {
    const api = serveSubtasks([second]);
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: `Renomear ${second.title}` }));
    const input = screen.getByLabelText('Nome da subtarefa');
    await user.clear(input);
    await user.type(input, 'Conectar a API{Enter}');

    await waitFor(() => expect(api.patches).toEqual([{ title: 'Conectar a API' }]));
    expect(await screen.findByRole('checkbox', { name: 'Conectar a API' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome da subtarefa')).not.toBeInTheDocument();
  });

  it('exclui depois de confirmar', async () => {
    const api = serveSubtasks([first, second]);
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: `Excluir subtarefa ${second.title}` }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(api.deleted).toEqual([second.id]));
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: second.title })).not.toBeInTheDocument());
    expect(await screen.findByText('1/1')).toBeInTheDocument();
  });
});
