import { ErrorState, LoadingList, Page, PageHeader } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { InviteMemberForm } from '../components/InviteMemberForm';
import { MembersTable } from '../components/MembersTable';
import { PendingInvites } from '../components/PendingInvites';

export function MembersPage() {
  const { data: user } = useCurrentUser();
  const { isAdmin } = useCurrentWorkspace();
  const { data: members, isPending, error, refetch } = useWorkspaceMembers();

  return (
    <Page>
      <PageHeader title="Membros" />
      {isAdmin && <InviteMemberForm />}
      {isPending && <LoadingList />}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {members && <MembersTable members={members} currentUserId={user?.id} isAdmin={isAdmin} />}
      {isAdmin && <PendingInvites />}
    </Page>
  );
}
