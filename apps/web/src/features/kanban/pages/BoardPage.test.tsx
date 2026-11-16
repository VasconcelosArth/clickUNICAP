import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { BoardPage } from './BoardPage';

const options = { route: `/p/${ids.project}/board`, path: '/p/:projectId/board' };

describe('BoardPage', () => {
  it('coloca o cartão na coluna do status, com o responsável', async () => {
    renderWithProviders(<BoardPage />, options);

    const column = await screen.findByRole('region', { name: 'Em andamento' });
    expect(within(column).getByRole('link', { name: task.title })).toBeInTheDocument();
    expect(await within(column).findByRole('img', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(within(column).getByText('Urgente')).toBeInTheDocument();
  });

  it('mostra as colunas vazias', async () => {
    renderWithProviders(<BoardPage />, options);

    const column = await screen.findByRole('region', { name: 'A fazer' });
    expect(within(column).getByText('Nenhuma tarefa aqui')).toBeInTheDocument();
  });

  it('mostra tarefa sem prazo e sem responsável', async () => {
    server.use(
      http.get('*/projects/:projectId/tasks', () => HttpResponse.json([{ ...task, dueDate: null, assigneeId: null }])),
    );

    renderWithProviders(<BoardPage />, options);

    expect(await screen.findByText('Sem prazo')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sem responsável' })).toBeInTheDocument();
  });

  it('marca o prazo vencido com a data', async () => {
    server.use(http.get('*/projects/:projectId/tasks', () => HttpResponse.json([{ ...task, dueDate: '2020-11-06' }])));

    renderWithProviders(<BoardPage />, options);

    expect(await screen.findByText('Venceu 6 nov')).toBeInTheDocument();
  });

  it('envia os filtros da URL para a API', async () => {
    let search = '';
    server.use(
      http.get('*/projects/:projectId/tasks', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<BoardPage />, { ...options, route: `${options.route}?priority=high&search=kanban` });

    await waitFor(() => expect(search).toBe('?search=kanban&priority=high'));
  });

  it('mostra o erro e permite tentar de novo', async () => {
    server.use(
      http.get('*/projects/:projectId/tasks', () =>
        HttpResponse.json({ statusCode: 500, error: 'Internal', message: 'Falhou' }, { status: 500 }),
      ),
    );

    renderWithProviders(<BoardPage />, options);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
