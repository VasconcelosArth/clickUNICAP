import type { Comment } from '@clickunicap/shared';
import { useState } from 'react';
import { Alert, Avatar, Button, ConfirmAction } from '@/components/ui';
import { useMembersById } from '@/hooks/useWorkspaceMembers';
import { formatDate } from '@/lib/utils';
import { useDeleteComment, useUpdateComment } from '../api/comments.queries';
import { CommentBody } from './CommentBody';
import { CommentForm } from './CommentForm';

export function CommentItem({ comment, isAuthor }: { comment: Comment; isAuthor: boolean }) {
  const author = useMembersById().get(comment.authorId);
  const update = useUpdateComment(comment.taskId);
  const remove = useDeleteComment(comment.taskId);
  const [editing, setEditing] = useState(false);
  const authorName = author?.name ?? 'Usuário removido';

  return (
    <li className="flex gap-3 py-3">
      <Avatar name={author?.name} avatarUrl={author?.avatarUrl} />
      <div className="grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{authorName}</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</span>
        </div>

        {editing ? (
          <CommentForm
            label="Editar comentário"
            submitLabel="Salvar"
            initialBody={comment.body}
            pending={update.isPending}
            error={update.error?.message}
            onCancel={() => setEditing(false)}
            onSubmit={(body) =>
              update.mutate({ id: comment.id, input: { body } }, { onSuccess: () => setEditing(false) })
            }
          />
        ) : (
          <CommentBody body={comment.body} />
        )}

        {isAuthor && !editing && (
          <div className="flex items-center gap-2 mt-1">
            <Button
              variant="ghost"
              size="xs"
              aria-label={`Editar comentário de ${authorName}`}
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
            <ConfirmAction
              label="Apagar"
              ariaLabel={`Apagar comentário de ${authorName}`}
              question="Apagar este comentário?"
              confirmLabel="Apagar"
              pending={remove.isPending}
              onConfirm={() => remove.mutate(comment.id)}
              triggerProps={{ variant: 'ghost', size: 'xs' }}
            />
          </div>
        )}
        {remove.error && (
          <div className="mt-2">
            <Alert>{remove.error.message}</Alert>
          </div>
        )}
      </div>
    </li>
  );
}
