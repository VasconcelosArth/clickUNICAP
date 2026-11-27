import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, project } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { ProjectLayout } from './ProjectLayout';

const options = { route: '/w/1/p/2/board', path: '/w/:workspaceId/p/:projectId/*' };

describe('ProjectLayout', () => {
  it('mostra o projeto, o resumo e só as visões que têm backend', async () => {
    renderWithProviders(<ProjectLayout />, options);

    expect(await screen.findByRole('heading', { name: project.name })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Resumo do projeto' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kanban' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lista' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gantt' })).toHaveAttribute('href', expect.stringMatching(/\/gantt$/));
    expect(screen.getByRole('link', { name: 'Horas' })).toHaveAttribute('href', expect.stringMatching(/\/hours$/));
    expect(screen.queryByRole('link', { name: 'Calendário' })).not.toBeInTheDocument();
    expect(screen.getByRole('search', { name: 'Filtrar tarefas' })).toBeInTheDocument();
  });

  it('no relatório de horas, esconde os filtros de tarefa', async () => {
    // As abas usam o workspace ativo, então a rota precisa ser dele para a aba aparecer como atual
    renderWithProviders(<ProjectLayout />, { ...options, route: `/w/${ids.workspace}/p/2/hours` });

    expect(await screen.findByRole('link', { name: 'Horas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('search', { name: 'Filtrar tarefas' })).not.toBeInTheDocument();
  });

  it('abre o formulário de nova tarefa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectLayout />, options);

    await user.click(await screen.findByRole('button', { name: 'Nova tarefa' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('não permite criar tarefa em projeto arquivado', async () => {
    server.use(
      http.get('*/projects/:projectId', () =>
        HttpResponse.json({ ...project, archivedAt: '2026-11-09T12:00:00.000Z' }),
      ),
    );

    renderWithProviders(<ProjectLayout />, options);

    expect(await screen.findByText('Arquivado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova tarefa' })).not.toBeInTheDocument();
  });

  it('mostra o erro quando o projeto não existe', async () => {
    server.use(
      http.get('*/projects/:projectId', () =>
        HttpResponse.json({ statusCode: 404, error: 'NotFound', message: 'Projeto não encontrado' }, { status: 404 }),
      ),
    );

    renderWithProviders(<ProjectLayout />, options);

    expect(await screen.findByRole('alert')).toHaveTextContent('Projeto não encontrado');
  });
});
