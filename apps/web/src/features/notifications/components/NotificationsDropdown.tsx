import type { Notification } from '@clickunicap/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, Button, EmptyState, ErrorState, IconButton, Skeleton } from '@/components/ui';
import { useTaskLink } from '@/hooks/useTaskLink';
import { cn } from '@/lib/utils';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '../api/notifications.queries';
import { bellLabel, describeNotification, timeAgo } from '../utils/describe';

interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}

function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const taskLink = useTaskLink();
  const unread = notification.readAt === null;
  const link = taskLink(notification.payload.taskId);

  return (
    <li className="border-b border-gray-200 dark:border-gray-700/60 last:border-0">
      <Link
        to={link.to}
        state={link.state}
        onClick={() => onOpen(notification)}
        className="block py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 focus-visible:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700/20"
      >
        <span
          className={cn(
            'block text-sm mb-1',
            unread ? 'font-medium text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400',
          )}
        >
          {unread && <span className="sr-only">Não lida: </span>}
          {describeNotification(notification)}
        </span>
        <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
          {timeAgo(notification.createdAt)}
        </span>
      </Link>
    </li>
  );
}

function NotificationsList({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const query = useNotifications(workspaceId, true);
  const markRead = useMarkRead(workspaceId);

  const open = (notification: Notification) => {
    if (notification.readAt === null) markRead.mutate(notification.id);
    onClose();
  };

  if (query.isPending) {
    return (
      <div role="status" aria-label="Carregando" className="space-y-2 px-4 py-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }
  if (query.isError) {
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  }

  const notifications = query.data.pages.flatMap((page) => page.data);
  if (notifications.length === 0) {
    return (
      <EmptyState
        title="Nenhuma notificação"
        description="Quando alguém atribuir uma tarefa a você, ela aparece aqui."
      />
    );
  }

  return (
    <>
      <ul aria-label="Notificações" className="max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} onOpen={open} />
        ))}
      </ul>
      {query.hasNextPage && (
        <div className="px-4 pt-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Carregar mais
          </Button>
        </div>
      )}
    </>
  );
}

/** Sino do topo: mostra o ponto vermelho quando há não lidas e abre a caixa de entrada do workspace ativo. */
export function NotificationsDropdown({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { data } = useUnreadCount(workspaceId);
  const markAllRead = useMarkAllRead(workspaceId);
  const unread = data?.count ?? 0;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const closeOnClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnClickOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <IconButton
        ref={buttonRef}
        aria-label={bellLabel(unread)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn('relative', open && 'bg-gray-200 dark:bg-gray-800')}
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-gray-100 dark:border-gray-900 rounded-full"
          />
        )}
      </IconButton>

      {open && (
        <div
          id={menuId}
          role="region"
          aria-label="Caixa de entrada"
          className="origin-top-right z-10 absolute top-full right-0 -mr-24 sm:mr-0 min-w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 transition ease-out duration-200 motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between gap-4 pt-1.5 pb-2 px-4">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Notificações</span>
            <Button
              variant="ghost"
              size="xs"
              disabled={unread === 0}
              loading={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Marcar todas como lidas
            </Button>
          </div>
          {markAllRead.isError && (
            <p role="alert" className="px-4 pb-2 text-xs text-red-800 dark:text-red-400">
              Não foi possível marcar como lidas. Tente de novo.
            </p>
          )}
          <NotificationsList workspaceId={workspaceId} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
