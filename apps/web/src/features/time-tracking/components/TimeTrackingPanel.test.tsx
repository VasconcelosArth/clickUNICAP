import type { CurrentTimer, StartTimerResult, TaskTimeEntries, TimeEntry } from '@clickunicap/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, task, workspace } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { timeEntry } from '../mocks/time-tracking.handlers';
import { TimeTrackingPanel } from './TimeTrackingPanel';

const otherTaskId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const brunosEntry = timeEntry({
  id: '88888888-8888-4888-8888-888888888888',
  userId: ids.otherUser,
  userName: 'Bruno Lima',
  minutes: 15,
  note: 'Revisão',
});

/** Estado do "servidor" que os handlers leem e as escritas mudam, para a tela refletir o que a API faria. */
function serve(initial: { entries?: TimeEntry[]; timer?: CurrentTimer['timer'] } = {}) {
  const state = { entries: initial.entries ?? [], timer: initial.timer ?? null };
  const list = (): TaskTimeEntries => ({
    entries: state.entries,
    totalMinutes: state.entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0),
  });
  server.use(
    http.get('*/tasks/:taskId/time-entries', () => HttpResponse.json(list())),
    http.get('*/time-entries/current', () => HttpResponse.json({ timer: state.timer })),
  );
  return state;
}

function renderPanel() {
  return renderWithProviders(<TimeTrackingPanel taskId={task.id} projectId={ids.project} />);
}

describe('TimeTrackingPanel', () => {
  it('mostra o carregamento e depois o vazio, com total zerado', async () => {
    serve();
    renderPanel();

    expect(screen.getByRole('status', { name: 'Carregando controle de tempo' })).toBeInTheDocument();
    expect(await screen.findByText('Nenhum tempo lançado')).toBeInTheDocument();
    expect(screen.getByText('0 min')).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'Cronômetro' })).toHaveTextContent('00:00:00');
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
  });

  it('mostra o erro e tenta de novo', async () => {
    let fail = true;
    serve();
    server.use(
      http.get('*/tasks/:taskId/time-entries', () =>
        fail
          ? HttpResponse.json({ statusCode: 500, error: 'INTERNAL', message: 'Falha no servidor' }, { status: 500 })
          : HttpResponse.json({ entries: [], totalMinutes: 0 }),
      ),
    );
    renderPanel();

    expect(await screen.findByText('Falha no servidor')).toBeInTheDocument();
    fail = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum tempo lançado')).toBeInTheDocument();
  });

  it('lista os lançamentos com duração, autor, nota e o total', async () => {
    serve({ entries: [timeEntry({ minutes: 90 }), brunosEntry] });
    renderPanel();

    const list = await screen.findByRole('list', { name: 'Lançamentos' });
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('1 h 30 min · Ana Souza');
    expect(items[1]).toHaveTextContent('15 min · Bruno Lima');
    expect(items[1]).toHaveTextContent('Revisão');
    expect(screen.getByText('1 h 45 min')).toBeInTheDocument();
  });

  it('iniciar mostra o selo "Em andamento", o cronômetro e o botão de pausar', async () => {
    const state = serve();
    let started = false;
    server.use(
      http.post('*/tasks/:taskId/time-entries/start', ({ params }) => {
        started = params.taskId === task.id;
        const timer = timeEntry({ startedAt: new Date().toISOString(), endedAt: null, minutes: null });
        state.timer = { ...timer, taskTitle: task.title };
        state.entries = [timer];
        return HttpResponse.json({ timer, stopped: null } satisfies StartTimerResult, { status: 201 });
      }),
    );
    renderPanel();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Iniciar' }));

    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument();
    expect(started).toBe(true);
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'Cronômetro' })).toHaveTextContent(/^00:00:0\d$/);
    // O timer que conta aparece na lista, sem botão de excluir
    const list = screen.getByRole('list', { name: 'Lançamentos' });
    expect(within(list).getByText('Contando')).toBeInTheDocument();
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
  });

  it('pausar grava o tempo e avisa quantos minutos foram lançados', async () => {
    const running = timeEntry({
      startedAt: new Date(Date.now() - 25 * 60_000).toISOString(),
      endedAt: null,
      minutes: null,
    });
    const state = serve({ entries: [running], timer: { ...running, taskTitle: task.title } });
    server.use(
      http.post('*/time-entries/current/stop', () => {
        const stopped = { ...running, endedAt: new Date().toISOString(), minutes: 25 };
        state.timer = null;
        state.entries = [stopped];
        return HttpResponse.json(stopped);
      }),
    );
    renderPanel();

    expect(await screen.findByRole('timer', { name: 'Cronômetro' })).toHaveTextContent(/^00:25:/);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Pausar' }));

    expect(await screen.findByText('Timer pausado: 25 min lançados.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument();
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
  });

  it('com timer em outra tarefa: mostra o link e, ao iniciar aqui, avisa que o outro foi pausado', async () => {
    const other = timeEntry({ taskId: otherTaskId, startedAt: new Date().toISOString(), endedAt: null, minutes: null });
    const state = serve({ timer: { ...other, taskTitle: 'Catalogar acervo' } });
    server.use(
      http.post('*/tasks/:taskId/time-entries/start', () => {
        const timer = timeEntry({ id: ids.invite, startedAt: new Date().toISOString(), endedAt: null, minutes: null });
        state.timer = { ...timer, taskTitle: task.title };
        return HttpResponse.json(
          { timer, stopped: { ...other, endedAt: new Date().toISOString(), minutes: 12 } } satisfies StartTimerResult,
          { status: 201 },
        );
      }),
    );
    renderPanel();

    const link = await screen.findByRole('link', { name: 'Catalogar acervo' });
    expect(link).toHaveAttribute('href', `/w/${ids.workspace}/t/${otherTaskId}`);
    expect(screen.getByText(/Iniciar aqui pausa o outro/)).toBeInTheDocument();
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Iniciar' }));

    expect(await screen.findByText('O timer de "Catalogar acervo" foi pausado com 12 min.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Catalogar acervo' })).not.toBeInTheDocument();
  });

  it('mostra o erro da API ao iniciar (timer em outro workspace)', async () => {
    serve();
    server.use(
      http.post('*/tasks/:taskId/time-entries/start', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            error: 'TIMER_RUNNING_ELSEWHERE',
            message: 'Você tem um timer ativo em outro workspace. Pare-o lá antes de iniciar outro.',
          },
          { status: 409 },
        ),
      ),
    );
    renderPanel();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Iniciar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Você tem um timer ativo em outro workspace');
  });

  describe('excluir', () => {
    it('o admin exclui qualquer lançamento, depois de confirmar', async () => {
      const state = serve({ entries: [timeEntry(), brunosEntry] });
      let deleted = '';
      server.use(
        http.delete('*/time-entries/:id', ({ params }) => {
          deleted = String(params.id);
          state.entries = state.entries.filter((e) => e.id !== deleted);
          return new HttpResponse(null, { status: 204 });
        }),
      );
      renderPanel();
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Excluir 15 min de Bruno Lima' }));
      expect(screen.getByText('Excluir este lançamento?')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Excluir' }));

      await waitFor(() => expect(screen.queryByText(/Bruno Lima/)).not.toBeInTheDocument());
      expect(deleted).toBe(brunosEntry.id);
      expect(screen.getByRole('button', { name: 'Excluir 30 min de Ana Souza' })).toBeInTheDocument();
    });

    it('um membro só vê o botão nos próprios lançamentos', async () => {
      server.use(http.get('*/workspaces/:workspaceId', () => HttpResponse.json({ ...workspace, myRole: 'member' })));
      serve({ entries: [timeEntry(), brunosEntry] });
      renderPanel();

      expect(await screen.findByRole('button', { name: 'Excluir 30 min de Ana Souza' })).toBeInTheDocument();
      await screen.findByText(/Bruno Lima/);
      expect(screen.queryByRole('button', { name: 'Excluir 15 min de Bruno Lima' })).not.toBeInTheDocument();
    });
  });

  describe('lançamento manual', () => {
    it('valida os minutos antes de enviar', async () => {
      serve();
      let posted = false;
      server.use(
        http.post('*/tasks/:taskId/time-entries', () => {
          posted = true;
          return HttpResponse.json(timeEntry(), { status: 201 });
        }),
      );
      renderPanel();
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Lançar tempo' }));
      expect(await screen.findByText('Informe os minutos')).toBeInTheDocument();

      await user.type(screen.getByLabelText('Minutos'), '0');
      await user.click(screen.getByRole('button', { name: 'Lançar tempo' }));
      expect(await screen.findByText('Informe pelo menos 1 minuto')).toBeInTheDocument();
      expect(posted).toBe(false);
    });

    it('envia minutos e nota, limpa os campos e atualiza a lista', async () => {
      const state = serve();
      let body: unknown = null;
      server.use(
        http.post('*/tasks/:taskId/time-entries', async ({ request }) => {
          body = await request.json();
          const created = timeEntry({ minutes: 45, note: 'Reunião' });
          state.entries = [created];
          return HttpResponse.json(created, { status: 201 });
        }),
      );
      renderPanel();
      const user = userEvent.setup();

      await user.type(await screen.findByLabelText('Minutos'), '45');
      await user.type(screen.getByLabelText('Nota (opcional)'), '  Reunião  ');
      await user.click(screen.getByRole('button', { name: 'Lançar tempo' }));

      await waitFor(() => expect(body).toEqual({ minutes: 45, note: 'Reunião' }));
      const list = await screen.findByRole('list', { name: 'Lançamentos' });
      expect(within(list).getByRole('listitem')).toHaveTextContent('45 min · Ana Souza');
      await waitFor(() => expect(screen.getByLabelText('Minutos')).toHaveValue(null));
      expect(screen.getByLabelText('Nota (opcional)')).toHaveValue('');
    });

    it('Enter envia o lançamento sem enviar nem limpar o formulário da tarefa em volta', async () => {
      serve();
      let body: unknown = null;
      server.use(
        http.post('*/tasks/:taskId/time-entries', async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(timeEntry(), { status: 201 });
        }),
      );
      const onTaskSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
      renderWithProviders(
        <form onSubmit={onTaskSubmit}>
          <input aria-label="Título da tarefa" defaultValue="Montar a vitrine" />
          <TimeTrackingPanel taskId={task.id} projectId={ids.project} />
        </form>,
      );
      const user = userEvent.setup();
      const title = screen.getByLabelText('Título da tarefa');
      await user.clear(title);
      await user.type(title, 'Título ainda não salvo');

      await user.type(await screen.findByLabelText('Minutos'), '20{Enter}');

      await waitFor(() => expect(body).toEqual({ minutes: 20 }));
      await waitFor(() => expect(screen.getByLabelText('Minutos')).toHaveValue(null));
      expect(onTaskSubmit).not.toHaveBeenCalled();
      expect(title).toHaveValue('Título ainda não salvo');
    });
  });
});
