import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Card, DueDate, PriorityBadge, StatusBadge } from '@/components/ui';
import { useTaskLink } from '@/hooks/useTaskLink';
import { useMembersById } from '@/hooks/useWorkspaceMembers';
import type { TaskGroup } from '@/lib/tasks';

/** Coluna extra depois de prioridade (hoje, os campos personalizados), montada fora da feature pelo `app/`. */
export interface TaskListColumn {
  id: string;
  header: string;
  renderCell: (taskId: string) => ReactNode;
}

export function TaskGroupTable({ group, extraColumns = [] }: { group: TaskGroup; extraColumns?: TaskListColumn[] }) {
  const membersById = useMembersById();
  const taskLink = useTaskLink();

  return (
    <Card>
      <header className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <StatusBadge status={group.status} />
        <span className="text-sm font-medium">{group.tasks.length}</span>
      </header>
      <div className="p-3 overflow-x-auto">
        <table className="table-auto w-full min-w-160 dark:text-gray-300">
          <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="p-2 font-semibold text-left">Tarefa</th>
              <th className="p-2 font-semibold text-left w-44">Responsável</th>
              <th className="p-2 font-semibold text-left w-32">Prazo</th>
              <th className="p-2 font-semibold text-left w-28">Prioridade</th>
              {extraColumns.map((column) => (
                <th key={column.id} className="p-2 font-semibold text-left whitespace-nowrap">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
            {group.tasks.map((task) => {
              const assignee = membersById.get(task.assigneeId ?? '');
              return (
                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                  <td className="p-2">
                    <Link
                      {...taskLink(task.id)}
                      className="text-gray-800 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-400"
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={assignee?.name} avatarUrl={assignee?.avatarUrl} />
                      <span className="truncate">{assignee?.name ?? 'Sem responsável'}</span>
                    </div>
                  </td>
                  <td className="p-2">
                    <DueDate task={task} />
                  </td>
                  <td className="p-2">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  {extraColumns.map((column) => (
                    <td key={column.id} className="p-2">
                      {column.renderCell(task.id)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {group.tasks.length === 0 && (
              <tr>
                <td colSpan={4 + extraColumns.length} className="p-4 font-normal">
                  Nenhuma tarefa aqui
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
