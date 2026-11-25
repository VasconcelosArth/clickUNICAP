import type { Task } from '@clickunicap/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { GanttPage } from './GanttPage';

const options = { route: `/w/${ids.workspace}/p/${ids.project}/gantt`, path: '/w/:workspaceId/p/:projectId/gantt' };

const catalog: Task = {
  ...task,
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Catalogar acervo',
  status: 'done',
  startDate: '2099-01-02',
  dueDate: '2099-01-05',
};
const exhibit: Task = {
  ...task,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  title: 'Montar exposição',
  status: 'in_progress',
  startDate: '2099-01-08',
  dueDate: '2099-01-10',
};
const loose: Task = {
  ...task,
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  title: 'Ideias soltas',
  startDate: null,
  dueDate: null,
};

function respond(tasks: Task[], dependencies: { taskId: string; dependsOnTaskId: string }[] = []) {
  server.use(
    http.get('*/projects/:projectId/tasks', () => HttpResponse.json(tasks)),
    http.get('*/projects/:projectId/dependencies', () =>
      HttpResponse.json(dependencies.map((d) => ({ ...d, createdAt: '2026-11-04T12:00:00.000Z' }))),
    ),
  );
}

describe('GanttPage', () => {
  it('lista as tarefas por início, com período e status em texto, e as sem datas no fim', async () => {
    respond([loose, exhibit, catalog]);
    renderWithProviders(<GanttPage />, options);

    const list = await screen.findByRole('list', { name: 'Tarefas na linha do tempo' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => within(li).getByRole('link').textContent)).toEqual([
      'Catalogar acervo',
      'Montar exposição',
      'Ideias soltas',
    ]);
    expect(items[0]).toHaveTextContent('2 jan – 5 jan');
    expect(items[0]).toHaveTextContent('Concluído');
    expect(items[2]).toHaveTextContent('Sem datas');
    expect(screen.getByText(/1 tarefa está sem datas/)).toBeInTheDocument();
  });

  it('desenha uma barra por tarefa com datas, na cor do status', async () => {
    respond([catalog, exhibit, loose]);
    renderWithProviders(<GanttPage />, options);

    const bar = await screen.findByTestId(`gantt-bar-${exhibit.id}`);
    expect(bar).toHaveClass('bg-sky-500');
    expect(bar).toHaveAttribute('title', 'Montar exposição · 8 jan – 10 jan · Em andamento');
    expect(screen.getByTestId(`gantt-bar-${catalog.id}`)).toHaveClass('bg-green-500');
    expect(screen.queryByTestId(`gantt-bar-${loose.id}`)).not.toBeInTheDocument();
  });

  it('desenha a seta da dependência', async () => {
    respond([catalog, exhibit], [{ taskId: exhibit.id, dependsOnTaskId: catalog.id }]);
    renderWithProviders(<GanttPage />, options);

    expect(await screen.findByTestId(`gantt-arrow-${exhibit.id}-${catalog.id}`)).toHaveClass('stroke-gray-400');
    expect(screen.queryByText(/datas em conflito/)).not.toBeInTheDocument();
  });

  it('avisa em texto quando a tarefa que espera começa antes da outra terminar', async () => {
    const early = { ...exhibit, startDate: '2099-01-03' };
    respond([catalog, early], [{ taskId: early.id, dependsOnTaskId: catalog.id }]);
    renderWithProviders(<GanttPage />, options);

    expect(await screen.findByText('1 dependência com datas em conflito:')).toBeInTheDocument();
    expect(screen.getByText('“Montar exposição” começa antes de “Catalogar acervo” terminar.')).toBeInTheDocument();
    expect(screen.getByTestId(`gantt-arrow-${early.id}-${catalog.id}`)).toHaveClass('stroke-red-500');
  });

  it('envia os filtros da URL para a API', async () => {
    let search = '';
    server.use(
      http.get('*/projects/:projectId/tasks', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );
    renderWithProviders(<GanttPage />, { ...options, route: `${options.route}?priority=high` });

    await waitFor(() => expect(search).toBe('?priority=high'));
    expect(await screen.findByText('Nenhuma tarefa encontrada')).toBeInTheDocument();
  });

  it('mostra o estado vazio do projeto', async () => {
    respond([]);
    renderWithProviders(<GanttPage />, options);

    expect(await screen.findByText('Nenhuma tarefa neste projeto')).toBeInTheDocument();
  });

  it('mostra o erro e permite tentar de novo', async () => {
    server.use(
      http.get('*/projects/:projectId/dependencies', () =>
        HttpResponse.json({ statusCode: 500, error: 'Internal', message: 'Falhou' }, { status: 500 }),
      ),
    );
    renderWithProviders(<GanttPage />, options);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
