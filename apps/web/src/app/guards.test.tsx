import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { GuestOnly, RequireAuth } from './guards';

const unauthorized = () =>
  HttpResponse.json({ statusCode: 401, error: 'Unauthorized', message: 'Sem sessão' }, { status: 401 });

function withoutSession() {
  server.use(http.get('*/users/me', unauthorized), http.post('*/auth/refresh', unauthorized));
}

describe('RequireAuth', () => {
  it('leva para o login e guarda o destino', async () => {
    withoutSession();

    renderWithProviders(<RequireAuth />, { route: '/w/1/projects?archived=1' });

    expect(await screen.findByText('Rota: /login?next=%2Fw%2F1%2Fprojects%3Farchived%3D1')).toBeInTheDocument();
  });

  it('volta para o login sem destino ao sair pelo perfil', async () => {
    withoutSession();

    renderWithProviders(<RequireAuth />, { route: '/profile' });

    expect(await screen.findByText('Rota: /login')).toBeInTheDocument();
  });
});

describe('GuestOnly', () => {
  it('manda quem já tem sessão para os workspaces', async () => {
    renderWithProviders(<GuestOnly />, { route: '/login' });

    expect(await screen.findByText('Rota: /workspaces')).toBeInTheDocument();
  });
});
