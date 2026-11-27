import { Fragment } from 'react';
import { useMembersById } from '@/hooks/useWorkspaceMembers';
import { splitMentions } from '../utils/mentions';

export function CommentBody({ body }: { body: string }) {
  const membersById = useMembersById();

  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {splitMentions(body).map((segment, index) =>
        segment.type === 'text' ? (
          <Fragment key={index}>{segment.text}</Fragment>
        ) : (
          <span key={index} className="font-medium text-violet-700 dark:text-violet-400">
            @{membersById.get(segment.userId)?.name ?? 'usuário removido'}
          </span>
        ),
      )}
    </p>
  );
}
