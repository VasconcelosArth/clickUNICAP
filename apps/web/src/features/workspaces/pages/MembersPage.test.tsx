import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, user as currentUser, workspace } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { MembersPage } from './MembersPage';

function viewAsMember() {
  server.use(
    http.get('*/workspaces/:workspaceId', () => HttpResponse.json({ ...workspace, myRole: 'member' })),
    http.get('*/users/me', () => HttpResponse.json({ ...currentUser, id: ids.otherUser, name: 'Bruno Lima' })),
  );
}

describe('MembersPage como admin', () => {
  it('lista pessoas e convites pendentes, com o papel do dono bloqueado', async () => {
    renderWithProviders(<MembersPage />);

    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument();
    expect(await screen.findByText('carla@exemplo.com')).toBeInTheDocument();
    expect(screen.getByText('Dono')).toBeInTheDocument();
    expect(screen.getByLabelText('Papel de Ana Souza')).toBeDisabled();
  });

  it('troca o papel de um membro', async () => {
    let body: unknown;
    server.use(
      http.patch('*/workspaces/:workspaceId/members/:userId', async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<MembersPage />);

    await user.selectOptions(await screen.findByLabelText('Papel de Bruno Lima'), 'admin');

    await waitFor(() => expect(body).toEqual({ role: 'admin' }));
  });

  it('pede confirmação antes de remover', async () => {
    let removed = '';
    server.use(
      http.delete('*/workspaces/:workspaceId/members/:userId', ({ params }) => {
        removed = String(params.userId);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<MembersPage />);

    await user.click(await screen.findByRole('button', { name: 'Remover Bruno Lima' }));
    expect(removed).toBe('');
    await user.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(removed).toBe(ids.otherUser));
  });

  it('envia convite e mostra o erro da API', async () => {
    server.use(
      http.post('*/workspaces/:workspaceId/invites', () =>
        HttpResponse.json(
          { statusCode: 409, error: 'Conflict', message: 'Essa pessoa já é membro do workspace' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<MembersPage />);

    await waitFor(() => expect(screen.getByLabelText('E-mail')).toBeInTheDocument());
    await user.type(screen.getByLabelText('E-mail'), 'bruno@exemplo.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('já é membro');
  });

  it('cancela um convite pendente', async () => {
    let revoked = '';
    server.use(
      http.delete('*/workspaces/:workspaceId/invites/:inviteId', ({ params }) => {
        revoked = String(params.inviteId);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<MembersPage />);

    await user.click(await screen.findByRole('button', { name: 'Cancelar convite de carla@exemplo.com' }));

    await waitFor(() => expect(revoked).toBe(ids.invite));
  });
});

describe('MembersPage como membro', () => {
  it('não mostra convites nem permite trocar papéis', async () => {
    viewAsMember();

    renderWithProviders(<MembersPage />);

    expect(await screen.findByLabelText('Papel de Bruno Lima')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Enviar convite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeInTheDocument();
  });

  it('sai do workspace e volta para a lista', async () => {
    viewAsMember();
    const user = userEvent.setup();
    renderWithProviders(<MembersPage />);

    await user.click(await screen.findByRole('button', { name: 'Sair' }));
    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Rota: /workspaces')).toBeInTheDocument();
  });
});
