import type { DependencyTask } from '@clickunicap/shared';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  CloseIcon,
  ErrorState,
  FormField,
  IconButton,
  SectionLabel,
  Select,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import type { TaskSlotProps } from '@/app/slots/task-detail-slots';
import { useTasks } from '@/features/tasks';
import { useActiveWorkspaceId } from '@/hooks/useCurrentWorkspace';
import { routes } from '@/lib/routes';
import { useAddDependency, useRemoveDependency, useTaskDependencies } from '../api/dependencies.queries';

type Direction = 'blockedBy' | 'blocking';

const DIRECTION_LABELS: Record<Direction, string> = {
  blockedBy: 'Esta tarefa espera por',
  blocking: 'Esta tarefa bloqueia',
};

function pendingText(count: number): string {
  return count === 1 ? '1 tarefa ainda não foi concluída' : `${count} tarefas ainda não foram concluídas`;
}

interface DependencyListProps {
  title: string;
  tasks: DependencyTask[];
  removing: boolean;
  onRemove: (task: DependencyTask) => void;
}

function DependencyList({ title, tasks, removing, onRemove }: DependencyListProps) {
  const workspaceId = useActiveWorkspaceId();
  // Mantém a tela de fundo: a outra tarefa abre no mesmo modal, e fechar volta para a visão de antes
  const { state } = useLocation();

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma</p>
      ) : (
        <ul aria-label={title} className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2 py-1.5">
              <Link
                to={routes.task(workspaceId, task.id)}
                state={state}
                replace
                title={task.title}
                className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-100 hover:underline"
              >
                {task.title}
              </Link>
              <StatusBadge status={task.status} />
              <IconButton
                aria-label={`Remover dependência com ${task.title}`}
                disabled={removing}
                onClick={() => onRemove(task)}
              >
                <CloseIcon />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Slot da barra lateral do detalhe da tarefa: "esperando por" e "bloqueando", com adicionar e remover. */
export function DependenciesPanel({ taskId, projectId }: TaskSlotProps) {
  const { data, isPending, error, refetch } = useTaskDependencies(taskId);
  const { data: projectTasks = [] } = useTasks(projectId);
  const add = useAddDependency();
  const remove = useRemoveDependency();
  const [direction, setDirection] = useState<Direction>('blockedBy');
  const [otherTaskId, setOtherTaskId] = useState('');

  if (isPending) {
    return (
      <div role="status" aria-label="Carregando dependências" className="space-y-2">
        <SectionLabel>Dependências</SectionLabel>
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <SectionLabel>Dependências</SectionLabel>
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </div>
    );
  }

  const linked = new Set([...data.blockedBy, ...data.blocking].map((task) => task.id));
  const candidates = projectTasks.filter((task) => task.id !== taskId && !linked.has(task.id));
  const pending = data.blockedBy.filter((task) => task.status !== 'done').length;
  const mutationError = add.error ?? remove.error;

  const submit = () => {
    if (!otherTaskId) return;
    const link =
      direction === 'blockedBy'
        ? { taskId, dependsOnTaskId: otherTaskId }
        : { taskId: otherTaskId, dependsOnTaskId: taskId };
    remove.reset();
    add.mutate(link, { onSuccess: () => setOtherTaskId('') });
  };

  return (
    <div className="space-y-4">
      <SectionLabel>Dependências</SectionLabel>
      {pending > 0 && (
        <p className="text-sm font-medium text-red-800 dark:text-red-400">Bloqueada: {pendingText(pending)}.</p>
      )}
      {mutationError && <Alert>{mutationError.message}</Alert>}

      <DependencyList
        title="Esperando por"
        tasks={data.blockedBy}
        removing={remove.isPending}
        onRemove={(task) => {
          add.reset();
          remove.mutate({ taskId, dependsOnTaskId: task.id });
        }}
      />
      <DependencyList
        title="Bloqueando"
        tasks={data.blocking}
        removing={remove.isPending}
        onRemove={(task) => {
          add.reset();
          remove.mutate({ taskId: task.id, dependsOnTaskId: taskId });
        }}
      />

      {/* Está dentro do formulário da tarefa: nada aqui envia o formulário, e nada espera o Salvar */}
      <div className="space-y-3 border-t border-gray-100 dark:border-gray-700/60 pt-4">
        <FormField label="Nova dependência">
          {(control) => (
            <Select {...control} value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
              {(Object.keys(DIRECTION_LABELS) as Direction[]).map((value) => (
                <option key={value} value={value}>
                  {DIRECTION_LABELS[value]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Tarefa"
          hint={candidates.length === 0 ? 'Não há outras tarefas neste projeto para ligar.' : undefined}
        >
          {(control) => (
            <Select
              {...control}
              value={otherTaskId}
              disabled={candidates.length === 0}
              onChange={(e) => setOtherTaskId(e.target.value)}
            >
              <option value="">Escolha uma tarefa</option>
              {candidates.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <Button variant="secondary" className="w-full" disabled={!otherTaskId} loading={add.isPending} onClick={submit}>
          Adicionar dependência
        </Button>
      </div>
    </div>
  );
}
