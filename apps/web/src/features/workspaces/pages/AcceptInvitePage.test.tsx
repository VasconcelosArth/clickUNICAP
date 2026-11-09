import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { AcceptInvitePage } from './AcceptInvitePage';

const route = '/invites/accept?token=abc';

describe('AcceptInvitePage', () => {
  it('aceita o convite e mostra o workspace', async () => {
    let body: unknown;
    server.use(
      http.post('*/invites/accept', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Time ClickUNICAP',
          ownerId: '11111111-1111-4111-8111-111111111111',
          createdAt: '2026-11-04T12:00:00.000Z',
          updatedAt: '2026-11-04T12:00:00.000Z',
          myRole: 'member',
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<AcceptInvitePage />, { route });

    await user.click(screen.getByRole('button', { name: 'Aceitar convite' }));

    expect(await screen.findByRole('status')).toHaveTextContent('você entrou em Time ClickUNICAP');
    expect(screen.getByRole('link', { name: 'Abrir workspace' })).toBeInTheDocument();
    expect(body).toEqual({ token: 'abc' });
  });

  it('mostra o erro e oferece entrar com outra conta', async () => {
    server.use(
      http.post('*/invites/accept', () =>
        HttpResponse.json(
          { statusCode: 403, error: 'Forbidden', message: 'Este convite foi enviado para outro e-mail.' },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<AcceptInvitePage />, { route });

    await user.click(screen.getByRole('button', { name: 'Aceitar convite' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('outro e-mail');
    expect(screen.getByRole('button', { name: 'Entrar com outra conta' })).toBeInTheDocument();
  });

  it('avisa quando o link não tem token', () => {
    renderWithProviders(<AcceptInvitePage />, { route: '/invites/accept' });

    expect(screen.getByRole('alert')).toHaveTextContent('Convite inválido ou expirado');
    expect(screen.queryByRole('button', { name: 'Aceitar convite' })).not.toBeInTheDocument();
  });
});
