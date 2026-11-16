import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { project } from '@/mocks/fixtures';
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
    expect(screen.queryByRole('link', { name: 'Gantt' })).not.toBeInTheDocument();
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
