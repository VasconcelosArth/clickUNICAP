import type { CustomField } from '@clickunicap/shared';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { TaskListRoute } from './TaskListRoute';

const options = { route: `/p/${ids.project}/list`, path: '/p/:projectId/list' };
const field = (id: string, name: string, type: CustomField['type'], position: number): CustomField => ({
  id,
  projectId: ids.project,
  name,
  type,
  options: type === 'dropdown' ? ['Design', 'Backend'] : null,
  isRequired: false,
  position,
  createdAt: '2026-11-04T12:00:00.000Z',
});
const fields = [
  field('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Área', 'dropdown', 0),
  field('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Estimativa', 'number', 1),
  field('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Revisão', 'date', 2),
  field('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Aprovado', 'checkbox', 3),
  field('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Ticket', 'text', 4),
];

describe('TaskListRoute', () => {
  it('mostra uma coluna por campo personalizado, depois das colunas da tarefa, formatada pelo tipo', async () => {
    server.use(
      http.get('*/projects/:projectId/custom-fields', () => HttpResponse.json(fields)),
      http.get('*/projects/:projectId/custom-field-values', () =>
        HttpResponse.json({
          [task.id]: {
            [fields[0]!.id]: 'Design',
            [fields[1]!.id]: 1234.5,
            [fields[2]!.id]: '2026-12-05',
            [fields[3]!.id]: true,
          },
        }),
      ),
    );

    renderWithProviders(<TaskListRoute />, options);

    const row = (await screen.findByRole('link', { name: task.title })).closest('tr') as HTMLElement;
    const table = row.closest('table') as HTMLElement;
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual([
      'Tarefa',
      'Responsável',
      'Prazo',
      'Prioridade',
      'Área',
      'Estimativa',
      'Revisão',
      'Aprovado',
      'Ticket',
    ]);

    expect(await within(row).findByText('Design')).toBeInTheDocument();
    expect(within(row).getByText('1.234,5')).toHaveClass('tabular-nums');
    expect(within(row).getByText('5 dez 2026')).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: 'Sim' })).toHaveTextContent('✓');
    expect(within(row).getByText('Sem valor')).toBeInTheDocument();
  });

  it('sem campos no projeto, a Lista fica só com as colunas da tarefa', async () => {
    renderWithProviders(<TaskListRoute />, options);

    const row = (await screen.findByRole('link', { name: task.title })).closest('tr') as HTMLElement;
    expect(within(row.closest('table') as HTMLElement).getAllByRole('columnheader')).toHaveLength(4);
  });
});
