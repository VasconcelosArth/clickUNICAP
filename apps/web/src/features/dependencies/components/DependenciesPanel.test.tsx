import type { TaskDependencies } from '@clickunicap/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { DependenciesPanel } from './DependenciesPanel';

const blockerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const waitingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const freeId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const blocker = {
  id: blockerId,
  title: 'Catalogar acervo',
  status: 'in_progress' as const,
  startDate: null,
  dueDate: null,
};
const waiting = { id: waitingId, title: 'Abrir exposição', status: 'todo' as const, startDate: null, dueDate: null };

const projectTasks = [
  task,
  { ...task, id: blockerId, title: blocker.title },
  { ...task, id: waitingId, title: waiting.title },
  { ...task, id: freeId, title: 'Restaurar peças' },
];

function respondWith(body: TaskDependencies) {
  server.use(
    http.get('*/tasks/:taskId/dependencies', () => HttpResponse.json(body)),
    http.get('*/projects/:projectId/tasks', () => HttpResponse.json(projectTasks)),
  );
}

function renderPanel() {
  return renderWithProviders(<DependenciesPanel taskId={task.id} projectId={ids.project} />);
}

describe('DependenciesPanel', () => {
  it('mostra as duas direções e avisa que a tarefa está bloqueada', async () => {
    respondWith({ blockedBy: [blocker], blocking: [waiting] });
    renderPanel();

    const waitingFor = await screen.findByRole('list', { name: 'Esperando por' });
    expect(within(waitingFor).getByRole('link', { name: blocker.title })).toBeInTheDocument();
    expect(within(waitingFor).getByText('Em andamento')).toBeInTheDocument();
    const blocking = screen.getByRole('list', { name: 'Bloqueando' });
    expect(within(blocking).getByRole('link', { name: waiting.title })).toBeInTheDocument();
    expect(screen.getByText('Bloqueada: 1 tarefa ainda não foi concluída.')).toBeInTheDocument();
  });

  it('não avisa bloqueio quando as tarefas esperadas já foram concluídas', async () => {
    respondWith({ blockedBy: [{ ...blocker, status: 'done' }], blocking: [] });
    renderPanel();

    await screen.findByRole('list', { name: 'Esperando por' });
    expect(screen.queryByText(/Bloqueada:/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Nenhuma')).toHaveLength(1);
  });

  it('oferece só tarefas do projeto que ainda não estão ligadas, sem a própria', async () => {
    respondWith({ blockedBy: [blocker], blocking: [] });
    renderPanel();

    const select = await screen.findByLabelText('Tarefa');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    const options = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toEqual(['Escolha uma tarefa', waiting.title, 'Restaurar peças']);
  });

  it('"espera por" envia a outra tarefa como a que bloqueia', async () => {
    respondWith({ blockedBy: [], blocking: [] });
    let sent: { url: string; body: unknown } | null = null;
    server.use(
      http.post('*/tasks/:taskId/dependencies', async ({ request }) => {
        sent = { url: new URL(request.url).pathname, body: await request.json() };
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    renderPanel();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Tarefa'), freeId);
    await user.click(screen.getByRole('button', { name: 'Adicionar dependência' }));

    await waitFor(() =>
      expect(sent).toEqual({ url: `/api/tasks/${task.id}/dependencies`, body: { dependsOnTaskId: freeId } }),
    );
  });

  it('"bloqueia" grava a dependência na outra tarefa', async () => {
    respondWith({ blockedBy: [], blocking: [] });
    let sent: { url: string; body: unknown } | null = null;
    server.use(
      http.post('*/tasks/:taskId/dependencies', async ({ request }) => {
        sent = { url: new URL(request.url).pathname, body: await request.json() };
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    renderPanel();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Nova dependência'), 'blocking');
    await user.selectOptions(screen.getByLabelText('Tarefa'), freeId);
    await user.click(screen.getByRole('button', { name: 'Adicionar dependência' }));

    await waitFor(() =>
      expect(sent).toEqual({ url: `/api/tasks/${freeId}/dependencies`, body: { dependsOnTaskId: task.id } }),
    );
  });

  it('mostra a mensagem da API quando a dependência criaria um ciclo', async () => {
    respondWith({ blockedBy: [], blocking: [] });
    server.use(
      http.post('*/tasks/:taskId/dependencies', () =>
        HttpResponse.json(
          { statusCode: 400, error: 'CIRCULAR_DEPENDENCY', message: 'A dependência criaria um ciclo.' },
          { status: 400 },
        ),
      ),
    );
    renderPanel();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Tarefa'), freeId);
    await user.click(screen.getByRole('button', { name: 'Adicionar dependência' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A dependência criaria um ciclo.');
  });

  it('remove nas duas direções com o par certo de tarefas', async () => {
    respondWith({ blockedBy: [blocker], blocking: [waiting] });
    const removed: string[] = [];
    server.use(
      http.delete('*/tasks/:taskId/dependencies/:dependsOnTaskId', ({ params }) => {
        removed.push(`${String(params.taskId)}<-${String(params.dependsOnTaskId)}`);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPanel();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: `Remover dependência com ${blocker.title}` }));
    await waitFor(() => expect(removed).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: `Remover dependência com ${waiting.title}` }));

    await waitFor(() => expect(removed).toEqual([`${task.id}<-${blockerId}`, `${waitingId}<-${task.id}`]));
  });

  it('mostra o erro de carregamento com a opção de tentar de novo', async () => {
    server.use(
      http.get('*/tasks/:taskId/dependencies', () =>
        HttpResponse.json({ statusCode: 500, error: 'Internal', message: 'Falhou' }, { status: 500 }),
      ),
    );
    renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
