import type { TaskSlotProps } from '@/app/slots/task-detail-slots';
import { ErrorState, Skeleton } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useComments, useCreateComment } from '../api/comments.queries';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';

export function CommentsPanel({ taskId }: TaskSlotProps) {
  const { data: comments, isPending, error, refetch } = useComments(taskId);
  const create = useCreateComment(taskId);
  const currentUserId = useCurrentUser().data?.id;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3">Comentários</h3>

      {isPending && (
        <div aria-busy="true" className="space-y-3 mb-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}
      {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}

      {comments && comments.length === 0 && <p className="text-sm mb-4">Nenhum comentário ainda.</p>}
      {comments && comments.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 mb-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} isAuthor={comment.authorId === currentUserId} />
          ))}
        </ul>
      )}

      <CommentForm
        label="Comentário"
        submitLabel="Comentar"
        pending={create.isPending}
        error={create.error?.message}
        onSubmit={(body, onDone) => create.mutate({ body }, { onSuccess: onDone })}
      />
    </div>
  );
}
