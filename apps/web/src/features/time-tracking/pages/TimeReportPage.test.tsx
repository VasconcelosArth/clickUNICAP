import type { TimeReport } from '@clickunicap/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { TimeReportPage } from './TimeReportPage';

// O canvas do Chart.js não roda no jsdom: o gráfico vira só o resumo acessível dele
vi.mock('../components/HoursBarChart', () => ({
  HoursBarChart: ({ label }: { label: string }) => <div role="img" aria-label={label} />,
}));

const base = `/w/${ids.workspace}/p/${ids.project}/hours`;
const path = '/w/:workspaceId/p/:projectId/hours';
const novembro = `${base}?from=2026-11-01&to=2026-11-30`;

const vitrine = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const acervo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const report = (over: Partial<TimeReport> = {}): TimeReport => ({
  from: new Date(2026, 10, 1).toISOString(),
  to: new Date(2026, 11, 1).toISOString(),
  totalMinutes: 135,
  byMember: [
    { userId: ids.user, userName: 'Ana Souza', minutes: 90 },
    { userId: ids.otherUser, userName: 'Bruno Lima', minutes: 45 },
  ],
  byTask: [
    { taskId: vitrine, taskTitle: 'Montar a vitrine', minutes: 105 },
    { taskId: acervo, taskTitle: 'Catalogar acervo', minutes: 30 },
  ],
  ...over,
});

/** Responde com `body` e guarda o período de cada pedido. */
function respond(body: TimeReport | (() => Response)) {
  const periods: { from: string | null; to: string | null }[] = [];
  server.use(
    http.get('*/projects/:projectId/time-report', ({ request }) => {
      const url = new URL(request.url);
      periods.push({ from: url.searchParams.get('from'), to: url.searchParams.get('to') });
      return typeof body === 'function' ? body() : HttpResponse.json(body);
    }),
  );
  return periods;
}

describe('TimeReportPage', () => {
  afterEach(() => vi.useRealTimers());

  it('mostra o total, as horas por membro e por tarefa do período da URL', async () => {
    const periods = respond(report());
    renderWithProviders(<TimeReportPage />, { route: novembro, path });

    expect(screen.getByRole('status', { name: 'Carregando relatório de horas' })).toBeInTheDocument();
    expect(await screen.findByText('Total no período:')).toHaveTextContent('Total no período: 2 h 15 min');
    // Do início de 1/11 ao início de 1/12, no fuso de quem usa
    expect(periods).toEqual([{ from: new Date(2026, 10, 1).toISOString(), to: new Date(2026, 11, 1).toISOString() }]);

    // O gráfico carrega sob demanda (lazy)
    expect(
      await screen.findByRole('img', { name: 'Horas por membro. Ana Souza: 1 h 30 min, Bruno Lima: 45 min' }),
    ).toBeVisible();
    const [members, tasks] = screen.getAllByRole('table');
    const memberRows = within(members!).getAllByRole('row').slice(1);
    expect(memberRows.map((row) => row.textContent)).toEqual(['Ana Souza1 h 30 min67%', 'Bruno Lima45 min33%']);

    const taskRows = within(tasks!).getAllByRole('row').slice(1);
    expect(taskRows.map((row) => row.textContent)).toEqual([
      'Montar a vitrine1 h 45 min78%',
      'Catalogar acervo30 min22%',
    ]);
    expect(within(tasks!).getByRole('link', { name: 'Montar a vitrine' })).toHaveAttribute(
      'href',
      `/w/${ids.workspace}/t/${vitrine}`,
    );
  });

  it('sem período na URL, mostra os últimos 30 dias', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 27, 15, 0), toFake: ['Date'] });
    const periods = respond(report());
    renderWithProviders(<TimeReportPage />, { route: base, path });

    expect(screen.getByLabelText('De')).toHaveValue('2026-10-29');
    expect(screen.getByLabelText('Até')).toHaveValue('2026-11-27');
    await screen.findByText('Total no período:');
    expect(periods).toEqual([{ from: new Date(2026, 9, 29).toISOString(), to: new Date(2026, 10, 28).toISOString() }]);
  });

  it('trocar a data atualiza a URL e busca o novo período', async () => {
    const periods = respond(report());
    renderWithProviders(<TimeReportPage />, { route: novembro, path });
    await screen.findByText('Total no período:');

    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-11-15' } });

    await waitFor(() =>
      expect(periods.at(-1)).toEqual({
        from: new Date(2026, 10, 1).toISOString(),
        to: new Date(2026, 10, 16).toISOString(),
      }),
    );
    expect(screen.getByLabelText('Até')).toHaveValue('2026-11-15');
  });

  it('período invertido mostra o erro e não busca', async () => {
    const periods = respond(report());
    renderWithProviders(<TimeReportPage />, { route: `${base}?from=2026-11-30&to=2026-11-01`, path });

    expect(await screen.findByRole('alert')).toHaveTextContent('A data final precisa ser igual ou depois da inicial');
    expect(screen.queryByText('Total no período:')).not.toBeInTheDocument();
    expect(periods).toEqual([]);
  });

  it('sem tempo no período, mostra o vazio', async () => {
    respond(report({ totalMinutes: 0, byMember: [], byTask: [] }));
    renderWithProviders(<TimeReportPage />, { route: novembro, path });

    expect(await screen.findByText('Nenhum tempo lançado neste período')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('mostra o erro da API e tenta de novo', async () => {
    const user = userEvent.setup();
    let fail = true;
    respond(() =>
      fail
        ? HttpResponse.json({ statusCode: 500, error: 'Internal', message: 'Falha no servidor' }, { status: 500 })
        : HttpResponse.json(report()),
    );
    renderWithProviders(<TimeReportPage />, { route: novembro, path });

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no servidor');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Total no período:')).toBeInTheDocument();
  });
});
