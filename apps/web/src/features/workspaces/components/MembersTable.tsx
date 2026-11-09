import type { MemberWithUser } from '@clickunicap/shared';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, CardHeader } from '@/components/ui';
import { routes } from '@/lib/routes';
import { useChangeMemberRole, useRemoveMember } from '../api/workspaces.queries';
import { MemberRow } from './MemberRow';

interface MembersTableProps {
  members: MemberWithUser[];
  currentUserId: string | undefined;
  isAdmin: boolean;
}

export function MembersTable({ members, currentUserId, isAdmin }: MembersTableProps) {
  const navigate = useNavigate();
  const changeRole = useChangeMemberRole();
  const removeMember = useRemoveMember();
  const error = changeRole.error ?? removeMember.error;

  const remove = (userId: string) =>
    removeMember.mutate(userId, {
      onSuccess: () => {
        if (userId === currentUserId) navigate(routes.workspaces);
      },
    });

  return (
    <Card className="mb-6">
      <CardHeader title="Pessoas" aside={<span className="text-sm font-medium">{members.length}</span>} />
      <div className="p-3 space-y-3">
        {error && <Alert>{error.message}</Alert>}
        <div className="overflow-x-auto">
          <table className="table-auto w-full min-w-160 dark:text-gray-300">
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="p-2 font-semibold text-left">Pessoa</th>
                <th className="p-2 font-semibold text-left w-52">Papel</th>
                <th className="p-2 w-48">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
              {members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  isMe={member.userId === currentUserId}
                  isAdmin={isAdmin}
                  onChangeRole={(role) => changeRole.mutate({ userId: member.userId, role })}
                  onRemove={() => remove(member.userId)}
                  removing={removeMember.isPending && removeMember.variables === member.userId}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
