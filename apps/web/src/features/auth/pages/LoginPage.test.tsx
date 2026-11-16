import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { LoginPage } from './LoginPage';

async function submit(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('E-mail'), email);
  if (password) await user.type(screen.getByLabelText('Senha'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage', () => {
  it('entra e vai para os workspaces', async () => {
    renderWithProviders(<LoginPage />, { route: '/login' });

    await submit('ana@exemplo.com', 'senha1234');

    expect(await screen.findByText('Rota: /workspaces')).toBeInTheDocument();
  });

  it('volta para a tela de origem depois do login', async () => {
    renderWithProviders(<LoginPage />, { route: '/login?next=/invites/accept' });

    await submit('ana@exemplo.com', 'senha1234');

    expect(await screen.findByText('Rota: /invites/accept')).toBeInTheDocument();
  });

  it('ignora destino externo', async () => {
    renderWithProviders(<LoginPage />, { route: '/login?next=//malicioso.com' });

    await submit('ana@exemplo.com', 'senha1234');

    expect(await screen.findByText('Rota: /workspaces')).toBeInTheDocument();
  });

  it('mostra o erro da API', async () => {
    server.use(
      http.post('*/auth/login', () =>
        HttpResponse.json(
          { statusCode: 401, error: 'Unauthorized', message: 'E-mail ou senha inválidos' },
          { status: 401 },
        ),
      ),
    );
    renderWithProviders(<LoginPage />, { route: '/login' });

    await submit('ana@exemplo.com', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos');
  });

  it('valida o formulário antes de chamar a API', async () => {
    renderWithProviders(<LoginPage />, { route: '/login' });

    await submit('', '');

    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
  });
});
