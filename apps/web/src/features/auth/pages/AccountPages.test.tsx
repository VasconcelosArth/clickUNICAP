import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ProfilePage } from './ProfilePage';
import { RegisterPage } from './RegisterPage';
import { ResetPasswordPage } from './ResetPasswordPage';

describe('RegisterPage', () => {
  it('cria a conta e vai para os workspaces', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: '/register' });

    await user.type(screen.getByLabelText('Nome'), 'Ana Souza');
    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'senha1234');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Rota: /workspaces')).toBeInTheDocument();
  });

  it('exige senha de pelo menos 8 caracteres', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: '/register' });

    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'curta');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('A senha precisa ter pelo menos 8 caracteres')).toBeInTheDocument();
  });
});

describe('ForgotPasswordPage', () => {
  it('confirma o envio sem revelar se a conta existe', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />, { route: '/forgot-password' });

    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Se este e-mail tiver uma conta');
  });
});

describe('ResetPasswordPage', () => {
  it('envia o token do link e volta para o login', async () => {
    let body: unknown;
    server.use(
      http.post('*/auth/reset-password', async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password?token=abc' });

    await user.type(screen.getByLabelText('Nova senha'), 'senha1234');
    await user.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(await screen.findByText('Rota: /login')).toBeInTheDocument();
    expect(body).toEqual({ token: 'abc', password: 'senha1234' });
  });

  it('avisa quando o link não tem token', () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/reset-password' });

    expect(screen.getByRole('alert')).toHaveTextContent('link de recuperação é inválido');
  });
});

describe('ProfilePage', () => {
  it('salva o nome e envia foto vazia como null', async () => {
    let body: unknown;
    server.use(
      http.patch('*/users/me', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Ana Maria',
          email: 'ana@exemplo.com',
          avatarUrl: null,
          createdAt: '2026-11-04T12:00:00.000Z',
        });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />, { route: '/profile' });

    const name = await screen.findByLabelText('Nome');
    await user.clear(name);
    await user.type(name, 'Ana Maria');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Alterações salvas');
    expect(body).toEqual({ name: 'Ana Maria', avatarUrl: null });
  });

  it('não deixa editar o e-mail', async () => {
    renderWithProviders(<ProfilePage />, { route: '/profile' });

    expect(await screen.findByLabelText('E-mail')).toBeDisabled();
  });

  it('encerra a sessão ao sair', async () => {
    let loggedOut = false;
    server.use(
      http.post('*/auth/logout', () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProfilePage />, { route: '/profile' });

    await user.click(await screen.findByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(loggedOut).toBe(true));
  });
});
