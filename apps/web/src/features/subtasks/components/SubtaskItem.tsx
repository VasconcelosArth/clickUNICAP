import type { Subtask } from '@clickunicap/shared';
import { useState } from 'react';
import { Alert, Button, Checkbox, ConfirmAction, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useDeleteSubtask, useUpdateSubtask } from '../api/subtasks.queries';

export function SubtaskItem({ subtask }: { subtask: Subtask }) {
  const update = useUpdateSubtask(subtask.taskId);
  const remove = useDeleteSubtask(subtask.taskId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const error = update.error ?? remove.error;

  const startEditing = () => {
    setTitle(subtask.title);
    setEditing(true);
  };

  const save = () => {
    const next = title.trim();
    if (!next) return;
    if (next === subtask.title) {
      setEditing(false);
      return;
    }
    update.mutate({ id: subtask.id, input: { title: next } }, { onSuccess: () => setEditing(false) });
  };

  return (
    <li className="py-2">
      <div className="flex items-center gap-3">
        <Checkbox
          aria-label={subtask.title}
          checked={subtask.isDone}
          onChange={(event) => update.mutate({ id: subtask.id, input: { isDone: event.target.checked } })}
        />
        {editing ? (
          <>
            <Input
              aria-label="Nome da subtarefa"
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  save();
                }
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setEditing(false);
                }
              }}
            />
            <Button size="sm" loading={update.isPending} disabled={!title.trim()} onClick={save}>
              Salvar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <span
              className={cn(
                'grow text-sm break-words',
                subtask.isDone ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100',
              )}
            >
              {subtask.title}
            </span>
            <Button variant="ghost" size="xs" aria-label={`Renomear ${subtask.title}`} onClick={startEditing}>
              Renomear
            </Button>
            <ConfirmAction
              label="Excluir"
              ariaLabel={`Excluir subtarefa ${subtask.title}`}
              question="Excluir esta subtarefa?"
              confirmLabel="Excluir"
              pending={remove.isPending}
              onConfirm={() => remove.mutate(subtask.id)}
              triggerProps={{ variant: 'ghost', size: 'xs' }}
            />
          </>
        )}
      </div>
      {error && (
        <div className="mt-2">
          <Alert>{error.message}</Alert>
        </div>
      )}
    </li>
  );
}
