import type { NotificationPage } from '@clickunicap/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { notificationIds, notifications } from '../mocks/notifications.handlers';
import { NotificationsDropdown } from './NotificationsDropdown';

function renderBell() {
  return renderWithProviders(<NotificationsDropdown workspaceId={ids.workspace} />);
}

async function openMenu() {
  const user = userEvent.setup();
  renderBell();
  await user.click(await screen.findByRole('button', { name: 'Notificações, 1 não lida' }));
  return user;
}

describe('NotificationsDropdown', () => {
  it('o sino diz quantas não lidas há e só busca a lista ao abrir', async () => {
    let listed = false;
    server.use(
      http.get('*/notifications', () => {
        listed = true;
        return HttpResponse.json<NotificationPage>({ data: notifications, nextCursor: null });
      }),
    );
    renderBell();

    const bell = await screen.findByRole('button', { name: 'Notificações, 1 não lida' });
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(listed).toBe(false);
  });

  it('sem não lidas, o sino diz isso e "Marcar todas" fica desabilitado', async () => {
    server.use(http.get('*/notifications/unread-count', () => HttpResponse.json({ count: 0 })));
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole('button', { name: 'Notificações, nenhuma não lida' }));
    expect(screen.getByRole('button', { name: 'Marcar todas como lidas' })).toBeDisabled();
  });

  it('lista as notificações, destacando as não lidas', async () => {
    await openMenu();

    const list = await screen.findByRole('list', { name: 'Notificações' });
    const items = within(list).getAllByRole('link');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Não lida: Bruno Lima atribuiu a você a tarefa "Setup do apps/web"');
    expect(items[1]).toHaveTextContent('O prazo de "Setup do apps/web" está chegando');
    expect(items[1]).not.toHaveTextContent('Não lida');
  });

  it('abrir uma não lida marca como lida e leva para a tarefa', async () => {
    let readId: string | undefined;
    server.use(
      http.post('*/notifications/:id/read', ({ params }) => {
        readId = String(params.id);
        return HttpResponse.json({ ...notifications[0], readAt: '2026-11-04T12:30:00.000Z' });
      }),
    );
    const user = await openMenu();

    await user.click(await screen.findByRole('link', { name: /atribuiu a você/ }));
    await waitFor(() => expect(readId).toBe(notificationIds.assigned));
    expect(screen.getByText(`Rota: /w/${ids.workspace}/t/${ids.task}`)).toBeInTheDocument();
  });

  it('abrir uma já lida não chama a API de novo', async () => {
    let calls = 0;
    server.use(
      http.post('*/notifications/:id/read', () => {
        calls += 1;
        return HttpResponse.json(notifications[1]);
      }),
    );
    const user = await openMenu();

    await user.click(await screen.findByRole('link', { name: /prazo/ }));
    expect(screen.getByText(`Rota: /w/${ids.workspace}/t/${ids.task}`)).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('marca todas como lidas e atualiza o sino', async () => {
    let count = 1;
    server.use(
      http.get('*/notifications/unread-count', () => HttpResponse.json({ count })),
      http.post('*/notifications/read-all', () => {
        count = 0;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = await openMenu();

    await user.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));
    expect(await screen.findByRole('button', { name: 'Notificações, nenhuma não lida' })).toBeInTheDocument();
  });

  it('vazio: explica o que vai aparecer', async () => {
    server.use(http.get('*/notifications', () => HttpResponse.json({ data: [], nextCursor: null })));
    await openMenu();

    expect(await screen.findByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('erro: mostra a mensagem e tenta de novo', async () => {
    let fail = true;
    server.use(
      http.get('*/notifications', () =>
        fail
          ? HttpResponse.json({ statusCode: 500, error: 'INTERNAL_ERROR', message: 'Erro interno' }, { status: 500 })
          : HttpResponse.json({ data: notifications, nextCursor: null }),
      ),
    );
    const user = await openMenu();

    expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('list', { name: 'Notificações' })).toBeInTheDocument();
  });

  it('carrega a próxima página com o cursor', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get('*/notifications', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return cursor
          ? HttpResponse.json({ data: [notifications[1]], nextCursor: null })
          : HttpResponse.json({ data: [notifications[0]], nextCursor: notificationIds.assigned });
      }),
    );
    const user = await openMenu();

    await user.click(await screen.findByRole('button', { name: 'Carregar mais' }));
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    expect(cursors).toEqual([null, notificationIds.assigned]);
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('fecha com Esc (devolvendo o foco ao sino) e com clique fora', async () => {
    const user = await openMenu();
    const bell = screen.getByRole('button', { name: 'Notificações, 1 não lida' });
    expect(screen.getByRole('region', { name: 'Caixa de entrada' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Caixa de entrada' })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();

    await user.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    await user.click(document.body);
    expect(screen.queryByRole('region', { name: 'Caixa de entrada' })).not.toBeInTheDocument();
  });
});
