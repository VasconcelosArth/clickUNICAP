import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, DueDate, PriorityBadge, StatusBadge } from '@/components/ui';
import { useTaskLink } from '@/hooks/useTaskLink';
import type { DueGroup } from '../utils/groupByDue';

interface MyTasksTableProps {
  group: DueGroup;
  renderProjectLink: (projectId: string) => ReactNode;
}

export function MyTasksTable({ group, renderProjectLink }: MyTasksTableProps) {
  const taskLink = useTaskLink();

  return (
    <Card>
      <header className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{group.label}</h2>
        <span className="text-sm font-medium">{group.tasks.length}</span>
      </header>
      <div className="p-3 overflow-x-auto">
        <table className="table-auto w-full min-w-160 dark:text-gray-300">
          <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="p-2 font-semibold text-left">Tarefa</th>
              <th className="p-2 font-semibold text-left w-48">Projeto</th>
              <th className="p-2 font-semibold text-left w-32">Status</th>
              <th className="p-2 font-semibold text-left w-32">Prazo</th>
              <th className="p-2 font-semibold text-left w-28">Prioridade</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
            {group.tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                <td className="p-2">
                  <Link
                    {...taskLink(task.id)}
                    className="text-gray-800 dark:text-gray-100 hover:text-violet-700 dark:hover:text-violet-400"
                  >
                    {task.title}
                  </Link>
                </td>
                <td className="p-2 truncate">{renderProjectLink(task.projectId)}</td>
                <td className="p-2">
                  <StatusBadge status={task.status} />
                </td>
                <td className="p-2">
                  <DueDate task={task} />
                </td>
                <td className="p-2">
                  <PriorityBadge priority={task.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
