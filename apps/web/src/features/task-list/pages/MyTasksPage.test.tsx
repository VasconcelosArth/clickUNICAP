import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { MyTasksPage } from './MyTasksPage';

const renderPage = (route = '/my-tasks') =>
  renderWithProviders(<MyTasksPage renderProjectLink={() => <span>Projeto do MVP</span>} />, {
    route,
    path: '/my-tasks',
  });

describe('MyTasksPage', () => {
  it('agrupa pelo prazo e mostra projeto, status e prioridade', async () => {
    server.use(
      http.get('*/tasks/my', () =>
        HttpResponse.json([
          { ...task, id: 'a', title: 'Atrasada', dueDate: '2020-01-10' },
          { ...task, id: 'b', title: 'Sem data', dueDate: null, status: 'todo' },
        ]),
      ),
    );

    renderPage();

    const overdue = (await screen.findByRole('heading', { name: 'Vencidas' })).closest('div') as HTMLElement;
    const row = within(overdue).getByRole('link', { name: 'Atrasada' }).closest('tr') as HTMLElement;
    expect(within(row).getByText('Projeto do MVP')).toBeInTheDocument();
    expect(within(row).getByText('Em andamento')).toBeInTheDocument();
    expect(within(row).getByText('Urgente')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sem prazo' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mais adiante' })).not.toBeInTheDocument();
  });

  it('pede só as pendentes, com a busca e a prioridade da URL, sem o responsável', async () => {
    let search = '';
    server.use(
      http.get('*/tasks/my', ({ request }) => {
        search = decodeURIComponent(new URL(request.url).search);
        return HttpResponse.json([]);
      }),
    );

    renderPage('/my-tasks?search=docs&priority=high&assigneeId=outro');

    await waitFor(() => expect(search).toBe('?search=docs&priority=high&status=todo,in_progress'));
    expect(screen.queryByLabelText('Responsável')).not.toBeInTheDocument();
    expect(await screen.findByText('Nenhuma tarefa encontrada')).toBeInTheDocument();
  });

  it('mostra o vazio quando não há tarefa com a pessoa', async () => {
    server.use(http.get('*/tasks/my', () => HttpResponse.json([])));

    renderPage();

    expect(await screen.findByText('Nenhuma tarefa pendente com você')).toBeInTheDocument();
  });

  it('mostra o erro e permite tentar de novo', async () => {
    server.use(
      http.get('*/tasks/my', () =>
        HttpResponse.json({ statusCode: 500, error: 'Internal', message: 'Falhou' }, { status: 500 }),
      ),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
