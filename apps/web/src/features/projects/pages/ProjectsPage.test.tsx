import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, project, workspace } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { ProjectsPage } from './ProjectsPage';

describe('ProjectsPage', () => {
  it('lista os projetos com link para o Kanban', async () => {
    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByRole('link', { name: project.name })).toHaveAttribute(
      'href',
      `/w/${ids.workspace}/p/${ids.project}/board`,
    );
  });

  it('mostra o estado vazio', async () => {
    server.use(http.get('*/projects', () => HttpResponse.json([])));

    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByText('Nenhum projeto por aqui')).toBeInTheDocument();
  });

  it('pede os arquivados à API ao marcar a opção', async () => {
    const searches: string[] = [];
    server.use(
      http.get('*/projects', ({ request }) => {
        searches.push(new URL(request.url).search);
        return HttpResponse.json([project]);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProjectsPage />);

    await user.click(screen.getByLabelText('Mostrar arquivados'));

    await waitFor(() => expect(searches).toContain('?includeArchived=true'));
  });

  it('arquiva o projeto quando quem usa é admin', async () => {
    let archived = false;
    server.use(
      http.post('*/projects/:projectId/archive', () => {
        archived = true;
        return HttpResponse.json(project);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProjectsPage />);

    await user.click(await screen.findByRole('button', { name: `Arquivar ${project.name}` }));

    await waitFor(() => expect(archived).toBe(true));
  });

  it('esconde a ação de arquivar de quem não é admin', async () => {
    server.use(http.get('*/workspaces/:workspaceId', () => HttpResponse.json({ ...workspace, myRole: 'member' })));

    renderWithProviders(<ProjectsPage />);

    await screen.findByRole('link', { name: project.name });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: `Arquivar ${project.name}` })).not.toBeInTheDocument(),
    );
  });

  it('cria um projeto pelo modal', async () => {
    let body: unknown;
    server.use(
      http.post('*/projects', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(project, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProjectsPage />);

    await user.click(screen.getByRole('button', { name: 'Novo projeto' }));
    await user.type(await screen.findByLabelText('Nome'), 'Novo');
    await user.click(screen.getByRole('button', { name: 'Criar projeto' }));

    await waitFor(() => expect(body).toEqual({ name: 'Novo', description: null, color: '#8470ff' }));
  });
});
