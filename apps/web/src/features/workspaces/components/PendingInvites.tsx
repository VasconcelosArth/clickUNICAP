import { MEMBER_ROLE_LABELS } from '@clickunicap/shared';
import { Alert, Button, Card, CardHeader, ErrorState, LoadingList } from '@/components/ui';
import { formatDay } from '@/lib/utils';
import { useInvites, useRevokeInvite } from '../api/workspaces.queries';

export function PendingInvites() {
  const { data: invites, isPending, error, refetch } = useInvites(true);
  const revokeInvite = useRevokeInvite();

  if (isPending) return <LoadingList rows={1} />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Convites pendentes" aside={<span className="text-sm font-medium">{invites.length}</span>} />
      <div className="p-3 space-y-3">
        {revokeInvite.error && <Alert>{revokeInvite.error.message}</Alert>}
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/20"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{invite.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {MEMBER_ROLE_LABELS[invite.role]} · expira em {formatDay(invite.expiresAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-800 dark:text-red-400"
                aria-label={`Cancelar convite de ${invite.email}`}
                loading={revokeInvite.isPending && revokeInvite.variables === invite.id}
                onClick={() => revokeInvite.mutate(invite.id)}
              >
                Cancelar
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
