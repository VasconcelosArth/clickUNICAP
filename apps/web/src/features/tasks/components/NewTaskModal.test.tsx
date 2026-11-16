import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { NewTaskModal } from './NewTaskModal';

describe('NewTaskModal', () => {
  it('cria a tarefa, enviando campos vazios como null', async () => {
    let body: unknown;
    server.use(
      http.post('*/projects/:projectId/tasks', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(task, { status: 201 });
      }),
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<NewTaskModal projectId={ids.project} open onClose={onClose} />);

    await user.type(screen.getByLabelText('Título'), 'Escrever testes');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(body).toEqual({
      title: 'Escrever testes',
      description: null,
      status: 'todo',
      priority: 'medium',
      assigneeId: null,
      startDate: null,
      dueDate: null,
    });
  });

  it('exige o título', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewTaskModal projectId={ids.project} open onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    expect(await screen.findByText('Informe o título')).toBeInTheDocument();
  });

  it('recusa início depois do prazo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewTaskModal projectId={ids.project} open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Título'), 'Tarefa');
    await user.type(screen.getByLabelText('Início'), '2026-11-20');
    await user.type(screen.getByLabelText('Prazo'), '2026-11-10');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    expect(await screen.findByText('A data de início não pode ser depois do prazo')).toBeInTheDocument();
  });

  it('oferece os membros do workspace como responsáveis', async () => {
    renderWithProviders(<NewTaskModal projectId={ids.project} open onClose={vi.fn()} />);

    expect(await screen.findByRole('option', { name: 'Bruno Lima' })).toBeInTheDocument();
  });

  it('mostra o erro da API', async () => {
    server.use(
      http.post('*/projects/:projectId/tasks', () =>
        HttpResponse.json(
          { statusCode: 409, error: 'Conflict', message: 'Este projeto está arquivado' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<NewTaskModal projectId={ids.project} open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Título'), 'Tarefa');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este projeto está arquivado');
  });
});
