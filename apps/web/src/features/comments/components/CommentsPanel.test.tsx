import type { Comment } from '@clickunicap/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { commentFixture } from '../mocks/comments.handlers';
import { CommentsPanel } from './CommentsPanel';

const mine: Comment = { ...commentFixture, body: `Veja com @[${ids.otherUser}]` };
const theirs: Comment = {
  ...commentFixture,
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  authorId: ids.otherUser,
  body: 'Combinado',
};

function renderPanel() {
  return renderWithProviders(<CommentsPanel taskId={ids.task} projectId={ids.project} />);
}

function serveComments(initial: Comment[]) {
  let list = initial;
  const posts: unknown[] = [];
  const patches: unknown[] = [];
  const deleted: string[] = [];
  server.use(
    http.get('*/tasks/:taskId/comments', () => HttpResponse.json(list)),
    http.post('*/tasks/:taskId/comments', async ({ request }) => {
      const body = (await request.json()) as { body: string };
      posts.push(body);
      const created = { ...commentFixture, id: crypto.randomUUID(), body: body.body };
      list = [...list, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch('*/comments/:id', async ({ params, request }) => {
      const body = (await request.json()) as { body: string };
      patches.push(body);
      list = list.map((comment) => (comment.id === params.id ? { ...comment, ...body } : comment));
      return HttpResponse.json(list.find((comment) => comment.id === params.id));
    }),
    http.delete('*/comments/:id', ({ params }) => {
      deleted.push(String(params.id));
      list = list.filter((comment) => comment.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { posts, patches, deleted };
}

describe('CommentsPanel', () => {
  it('mostra o estado vazio', async () => {
    renderPanel();

    expect(await screen.findByText('Nenhum comentário ainda.')).toBeInTheDocument();
  });

  it('mostra o erro da listagem', async () => {
    server.use(
      http.get('*/tasks/:taskId/comments', () =>
        HttpResponse.json({ statusCode: 404, error: 'NOT_FOUND', message: 'Tarefa não encontrada' }, { status: 404 }),
      ),
    );

    renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent('Tarefa não encontrada');
  });

  it('mostra o autor, o texto e a menção com o nome do membro', async () => {
    serveComments([mine, theirs]);
    renderPanel();

    expect(await screen.findByText('@Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('@Bruno Lima')).toHaveClass('text-violet-700');
    expect(screen.getByText('Combinado')).toBeInTheDocument();
    expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
  });

  it('mostra Editar e Apagar só nos comentários do usuário logado', async () => {
    serveComments([mine, theirs]);
    renderPanel();

    await screen.findByText('Combinado');

    expect(screen.getAllByRole('button', { name: /^Editar comentário de/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Apagar comentário de/ })).toHaveLength(1);
  });

  it('comenta com menção pelo @: o campo mostra o nome, o envio guarda o id e o campo é limpo', async () => {
    const api = serveComments([]);
    const user = userEvent.setup();
    renderPanel();

    const field = await screen.findByLabelText('Comentário');
    expect(screen.getByRole('button', { name: 'Comentar' })).toBeDisabled();
    await user.type(field, 'Oi @bru');
    const list = await screen.findByRole('listbox', { name: 'Membros para mencionar' });
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    await user.click(within(list).getByRole('option', { name: 'Bruno Lima' }));

    expect(field).toHaveValue('Oi @Bruno Lima ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.type(field, 'veja');
    await user.click(screen.getByRole('button', { name: 'Comentar' }));

    await waitFor(() => expect(api.posts).toEqual([{ body: `Oi @[${ids.otherUser}] veja` }]));
    expect(await screen.findByText('@Bruno Lima')).toBeInTheDocument();
    expect(field).toHaveValue('');
  });

  it('navega na lista de menções pelo teclado (setas, Enter e Esc)', async () => {
    serveComments([]);
    const user = userEvent.setup();
    renderPanel();

    const field = await screen.findByLabelText('Comentário');
    expect(field).toHaveAttribute('aria-autocomplete', 'list');
    await user.type(field, '@');
    const list = await screen.findByRole('listbox');
    const options = within(list).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(field).toHaveAttribute('aria-controls', list.id);
    expect(field).toHaveAttribute('aria-activedescendant', options[0]!.id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(field).toHaveAttribute('aria-activedescendant', options[1]!.id);
    await user.keyboard('{ArrowDown}');
    expect(field).toHaveAttribute('aria-activedescendant', options[0]!.id);
    await user.keyboard('{ArrowUp}');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(field).toHaveValue('@Bruno Lima ');
    expect(field).not.toHaveAttribute('aria-activedescendant');

    await user.type(field, '@an');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(field).toHaveValue('@Bruno Lima @an');
  });

  it('fecha a lista quando ninguém combina com o texto', async () => {
    serveComments([]);
    const user = userEvent.setup();
    renderPanel();

    await user.type(await screen.findByLabelText('Comentário'), '@zzz');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('mostra o erro da API ao comentar e mantém o texto', async () => {
    server.use(
      http.post('*/tasks/:taskId/comments', () =>
        HttpResponse.json({ statusCode: 404, error: 'NOT_FOUND', message: 'Tarefa não encontrada' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.type(await screen.findByLabelText('Comentário'), 'Oi');
    await user.click(screen.getByRole('button', { name: 'Comentar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tarefa não encontrada');
    expect(screen.getByLabelText('Comentário')).toHaveValue('Oi');
  });

  it('edita o próprio comentário', async () => {
    const api = serveComments([theirs, { ...mine, body: 'Texto antigo' }]);
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: /^Editar comentário de/ }));
    const field = screen.getByLabelText('Editar comentário');
    expect(field).toHaveValue('Texto antigo');
    await user.clear(field);
    await user.type(field, 'Texto novo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.patches).toEqual([{ body: 'Texto novo' }]));
    expect(await screen.findByText('Texto novo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Editar comentário')).not.toBeInTheDocument();
  });

  it('edita mostrando o nome no lugar do id e grava de volta o id', async () => {
    const api = serveComments([theirs, mine]);
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: /^Editar comentário de/ }));
    const field = screen.getByLabelText('Editar comentário');
    expect(field).toHaveValue('Veja com @Bruno Lima');
    await user.type(field, ' e @an');
    await user.keyboard('{Enter}');
    expect(field).toHaveValue('Veja com @Bruno Lima e @Ana Souza ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.patches).toEqual([{ body: `Veja com @[${ids.otherUser}] e @[${ids.user}]` }]));
  });

  it('apaga depois de confirmar', async () => {
    const api = serveComments([mine, theirs]);
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: /^Apagar comentário de/ }));
    await user.click(screen.getByRole('button', { name: 'Apagar' }));

    await waitFor(() => expect(api.deleted).toEqual([mine.id]));
    await waitFor(() => expect(screen.queryByText('@Bruno Lima')).not.toBeInTheDocument());
  });
});
