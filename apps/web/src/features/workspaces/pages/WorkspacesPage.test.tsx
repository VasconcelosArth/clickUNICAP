import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, workspace } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { WorkspacesPage } from './WorkspacesPage';

describe('WorkspacesPage', () => {
  it('lista os workspaces com o papel de quem está logado', async () => {
    renderWithProviders(<WorkspacesPage />, { route: '/workspaces' });

    expect(await screen.findByRole('link', { name: /Time ClickUNICAP/ })).toHaveAttribute('href', `/w/${workspace.id}`);
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('mostra o estado vazio para quem não tem workspace', async () => {
    server.use(http.get('*/workspaces', () => HttpResponse.json([])));

    renderWithProviders(<WorkspacesPage />, { route: '/workspaces' });

    expect(await screen.findByText('Você ainda não tem um workspace')).toBeInTheDocument();
  });

  it('cria o workspace e abre ele', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />, { route: '/workspaces' });

    await user.type(screen.getByLabelText('Nome'), 'Time de TCC');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(await screen.findByText(`Rota: /w/${ids.workspace}`)).toBeInTheDocument();
  });

  it('exige o nome', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />, { route: '/workspaces' });

    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
  });
});
