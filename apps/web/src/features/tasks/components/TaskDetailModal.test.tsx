import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { TaskDetailModal } from './TaskDetailModal';

function renderModal() {
  return renderWithProviders(<TaskDetailModal renderProjectLink={() => 'Projeto X'} />, {
    route: `/w/${ids.workspace}/t/${ids.task}`,
    path: '/w/:workspaceId/t/:taskId',
  });
}

function capturePatch() {
  const bodies: unknown[] = [];
  let current = task;
  server.use(
    http.get('*/tasks/:taskId', () => HttpResponse.json(current)),
    http.patch('*/tasks/:taskId', async ({ request }) => {
      const body = (await request.json()) as object;
      bodies.push(body);
      current = { ...current, ...body };
      return HttpResponse.json(current);
    }),
  );
  return bodies;
}

describe('TaskDetailModal', () => {
  it('mostra os dados da tarefa, com o responsável selecionado', async () => {
    renderModal();

    expect(await screen.findByLabelText('Título')).toHaveValue(task.title);
    expect(screen.getByLabelText('Status')).toHaveValue('in_progress');
    expect(screen.getByLabelText('Prioridade')).toHaveValue('urgent');
    expect(screen.getByLabelText('Responsável')).toHaveValue(ids.user);
    expect(screen.getByText('Projeto X')).toBeInTheDocument();
  });

  it('mantém o Salvar desabilitado enquanto nada mudou', async () => {
    renderModal();

    await screen.findByLabelText('Título');

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('só grava o status ao clicar em Salvar', async () => {
    const bodies = capturePatch();
    const user = userEvent.setup();
    renderModal();

    await user.selectOptions(await screen.findByLabelText('Status'), 'done');
    expect(bodies).toEqual([]);
    expect(screen.getAllByText('Concluído').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(bodies).toEqual([{ status: 'done' }]));
    expect(await screen.findByRole('status')).toHaveTextContent('Alterações salvas');
    expect(screen.getByLabelText('Status')).toHaveValue('done');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('envia só os campos que mudaram', async () => {
    const bodies = capturePatch();
    const user = userEvent.setup();
    renderModal();

    await user.type(await screen.findByLabelText('Título'), ' v2');
    await user.selectOptions(screen.getByLabelText('Responsável'), '');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(bodies).toEqual([{ title: `${task.title} v2`, assigneeId: null }]));
  });

  it('não salva título vazio', async () => {
    const bodies = capturePatch();
    const user = userEvent.setup();
    renderModal();

    await user.clear(await screen.findByLabelText('Título'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o título')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('não salva início depois do prazo', async () => {
    const bodies = capturePatch();
    const user = userEvent.setup();
    renderModal();

    fireEvent.change(await screen.findByLabelText('Início'), { target: { value: '2100-01-01' } });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('A data de início não pode ser depois do prazo')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('mostra o erro da API e mantém o que foi alterado', async () => {
    server.use(
      http.patch('*/tasks/:taskId', () =>
        HttpResponse.json(
          { statusCode: 409, error: 'Conflict', message: 'Este projeto está arquivado' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderModal();

    await user.selectOptions(await screen.findByLabelText('Status'), 'done');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Este projeto está arquivado');
    expect(screen.getByLabelText('Status')).toHaveValue('done');
  });

  it('exclui depois de confirmar e volta para o projeto', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole('button', { name: 'Excluir tarefa' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText(`Rota: /w/${ids.workspace}/p/${ids.project}/board`)).toBeInTheDocument();
  });

  it('mostra o erro quando a tarefa é de outro workspace', async () => {
    server.use(
      http.get('*/tasks/:taskId', () =>
        HttpResponse.json({ statusCode: 404, error: 'NotFound', message: 'Tarefa não encontrada' }, { status: 404 }),
      ),
    );

    renderModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('Tarefa não encontrada');
  });
});
