import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { TaskListPage } from './TaskListPage';

const options = { route: `/p/${ids.project}/list`, path: '/p/:projectId/list' };

describe('TaskListPage', () => {
  it('mostra a tarefa com responsável, prazo e prioridade', async () => {
    renderWithProviders(<TaskListPage />, options);

    const row = (await screen.findByRole('link', { name: task.title })).closest('tr');
    expect(row).not.toBeNull();
    expect(await within(row as HTMLElement).findByText('Ana Souza')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Urgente')).toBeInTheDocument();
  });

  it('agrupa nas três situações, mesmo sem tarefas', async () => {
    server.use(http.get('*/projects/:projectId/tasks', () => HttpResponse.json([])));

    renderWithProviders(<TaskListPage />, options);

    expect(await screen.findAllByText('Nenhuma tarefa aqui')).toHaveLength(3);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('mostra as colunas extras recebidas depois de prioridade', async () => {
    const extraColumns = [{ id: 'extra', header: 'Área', renderCell: (taskId: string) => `valor de ${taskId}` }];

    renderWithProviders(<TaskListPage extraColumns={extraColumns} />, options);

    const row = (await screen.findByRole('link', { name: task.title })).closest('tr') as HTMLElement;
    expect(within(row).getByText(`valor de ${task.id}`)).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'Área' }).length).toBeGreaterThan(0);
  });
});
