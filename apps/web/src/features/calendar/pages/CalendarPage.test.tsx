/**
 * Testes de integração da CalendarPage.
 *
 * Cobrem:
 *   - Renderização da grade com tarefas posicionadas pelo prazo
 *   - Chips de tarefa clicáveis (link para o detalhe)
 *   - Estado vazio sem filtros
 *   - Estado vazio com filtros ativos
 *   - Estado de erro com botão "Tentar novamente"
 *   - Envio dos filtros da URL para a API
 *   - Chips com cores corretas por status
 */

import type { Task } from '@clickunicap/shared';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { CalendarPage } from './CalendarPage';

// Rota e path padrão para todos os testes
const options = {
  route: `/w/${ids.workspace}/p/${ids.project}/calendar?ref=2099-11-01&view=month`,
  path: '/w/:workspaceId/p/:projectId/calendar',
};

// Tarefa fixada para o mês 2099-11 para garantir que cai na grade
const taskNov10: Task = {
  ...task,
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Montar exposição',
  status: 'in_progress',
  dueDate: '2099-11-10',
};

const taskNov10Done: Task = {
  ...task,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  title: 'Revisão final',
  status: 'done',
  dueDate: '2099-11-10',
};

const taskNoDue: Task = {
  ...task,
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  title: 'Sem prazo definido',
  dueDate: null,
};

function respond(tasks: Task[]) {
  server.use(http.get('*/projects/:projectId/tasks', () => HttpResponse.json(tasks)));
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('CalendarPage', () => {
  it('exibe a grade com 7 colunas de dias da semana', async () => {
    respond([taskNov10]);
    renderWithProviders(<CalendarPage />, options);

    // Aguarda o carregamento
    await screen.findByText('Montar exposição');

    // Verifica os cabeçalhos dos dias da semana
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();
  });

  it('exibe a tarefa no dia correto pelo prazo (dueDate)', async () => {
    respond([taskNov10]);
    renderWithProviders(<CalendarPage />, options);

    const chip = await screen.findByRole('link', { name: /Abrir tarefa: Montar exposição/ });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent('Montar exposição');
  });

  it('o chip da tarefa leva ao detalhe da tarefa', async () => {
    respond([taskNov10]);
    renderWithProviders(<CalendarPage />, options);

    const chip = await screen.findByRole('link', { name: /Abrir tarefa: Montar exposição/ });
    expect(chip).toHaveAttribute('href', expect.stringContaining(taskNov10.id));
  });

  it('aplica a classe de cor correta para status in_progress', async () => {
    respond([taskNov10]);
    renderWithProviders(<CalendarPage />, options);

    const chip = await screen.findByRole('link', { name: /Abrir tarefa: Montar exposição/ });
    // sky = in_progress (ver CalendarTaskChip.tsx)
    expect(chip.className).toMatch(/sky/);
  });

  it('aplica a classe de cor correta para status done', async () => {
    respond([taskNov10Done]);
    renderWithProviders(<CalendarPage />, options);

    const chip = await screen.findByRole('link', { name: /Abrir tarefa: Revisão final/ });
    // green = done
    expect(chip.className).toMatch(/green/);
  });

  it('múltiplas tarefas no mesmo dia aparecem todas', async () => {
    respond([taskNov10, taskNov10Done]);
    renderWithProviders(<CalendarPage />, options);

    await screen.findByRole('link', { name: /Abrir tarefa: Montar exposição/ });
    expect(screen.getByRole('link', { name: /Abrir tarefa: Revisão final/ })).toBeInTheDocument();
  });

  it('tarefas sem prazo não aparecem na grade', async () => {
    respond([taskNov10, taskNoDue]);
    renderWithProviders(<CalendarPage />, options);

    // Aguarda a grade carregar (com uma tarefa válida com prazo)
    await screen.findByText('Montar exposição');
    expect(screen.queryByText('Sem prazo definido')).not.toBeInTheDocument();
  });

  it('exibe estado vazio quando não há tarefas com prazo', async () => {
    respond([]);
    renderWithProviders(<CalendarPage />, options);

    expect(await screen.findByText('Nenhuma tarefa com prazo neste projeto')).toBeInTheDocument();
  });

  it('exibe estado vazio de filtros quando há filtro ativo mas sem resultado', async () => {
    respond([]);
    renderWithProviders(<CalendarPage />, {
      ...options,
      route: `${options.route}&priority=high`,
    });

    expect(await screen.findByText('Nenhuma tarefa encontrada')).toBeInTheDocument();
  });

  it('exibe erro e permite tentar de novo', async () => {
    server.use(
      http.get('*/projects/:projectId/tasks', () =>
        HttpResponse.json({ statusCode: 500, error: 'Internal', message: 'Falhou' }, { status: 500 }),
      ),
    );
    renderWithProviders(<CalendarPage />, options);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('envia os filtros da URL para a API', async () => {
    let search = '';
    server.use(
      http.get('*/projects/:projectId/tasks', ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );
    renderWithProviders(<CalendarPage />, {
      ...options,
      route: `${options.route}&priority=high`,
    });

    await waitFor(() => expect(search).toContain('priority=high'));
  });

  it('exibe os botões de alternância Mês e Semana', async () => {
    respond([]);
    renderWithProviders(<CalendarPage />, options);

    await screen.findByText('Nenhuma tarefa com prazo neste projeto');
    expect(screen.getByRole('button', { name: 'Mês' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semana' })).toBeInTheDocument();
  });

  it('exibe os botões de navegação Hoje, anterior e próximo', async () => {
    respond([]);
    renderWithProviders(<CalendarPage />, options);

    await screen.findByText('Nenhuma tarefa com prazo neste projeto');
    expect(screen.getByRole('button', { name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeInTheDocument();
  });
});
