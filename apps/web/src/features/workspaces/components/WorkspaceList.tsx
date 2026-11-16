import { MEMBER_ROLE_LABELS, type MyWorkspace } from '@clickunicap/shared';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@/components/ui';
import { routes } from '@/lib/routes';

export function WorkspaceList({ workspaces }: { workspaces: MyWorkspace[] }) {
  return (
    <Card className="overflow-hidden mb-6">
      <ul>
        {workspaces.map((workspace) => (
          <li key={workspace.id} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
            <Link
              to={routes.workspace(workspace.id)}
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/20"
            >
              <span
                aria-hidden="true"
                className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-semibold bg-violet-500/20 text-violet-700 dark:text-violet-300"
              >
                {workspace.name.charAt(0).toUpperCase()}
              </span>
              <span className="grow min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                {workspace.name}
              </span>
              <Badge>{MEMBER_ROLE_LABELS[workspace.myRole]}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
