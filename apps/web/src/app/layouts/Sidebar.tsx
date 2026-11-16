import { useEffect, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDownIcon, ChevronsIcon, FolderIcon, IconButton, LinkButton, Logo, UsersIcon } from '@/components/ui';
import { useProjects } from '@/features/projects';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui.store';

const hiddenWhenCollapsed = 'lg:hidden lg:sidebar-expanded:block 2xl:block';

interface SideLinkProps {
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: ReactNode;
}

function SideLink({ to, icon: Icon, children }: SideLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-4 pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 text-sm font-medium text-gray-800 dark:text-gray-100 max-md:min-h-11',
          isActive
            ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700/20',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={isActive ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500'} />
          <span className="truncate lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
            {children}
          </span>
        </>
      )}
    </NavLink>
  );
}

function ProjectLinks({ workspaceId }: { workspaceId: string }) {
  const { data: projects = [] } = useProjects();

  return (
    <div>
      <div className="flex justify-between items-center px-3 mb-3">
        <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Projetos</h2>
        <Link
          to={routes.projects(workspaceId)}
          className={cn(
            'text-xs font-medium text-violet-700 dark:text-violet-400 hover:underline',
            hiddenWhenCollapsed,
          )}
        >
          Ver todos
        </Link>
      </div>
      {projects.map((project) => (
        <SideLink key={project.id} to={routes.project(workspaceId, project.id)} icon={FolderIcon}>
          {project.name}
        </SideLink>
      ))}
    </div>
  );
}

function useSidebarBehavior() {
  const { pathname } = useLocation();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const sidebarExpanded = useUiStore((state) => state.sidebarExpanded);

  useEffect(() => setSidebarOpen(false), [pathname, setSidebarOpen]);

  useEffect(() => {
    document.body.classList.toggle('sidebar-expanded', sidebarExpanded);
  }, [sidebarExpanded]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen, setSidebarOpen]);
}

export function Sidebar() {
  useSidebarBehavior();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const sidebarExpanded = useUiStore((state) => state.sidebarExpanded);
  const toggleSidebarExpanded = useUiStore((state) => state.toggleSidebarExpanded);
  const { workspaceId, data: workspace } = useCurrentWorkspace();

  return (
    <div className="min-w-fit">
      <div
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'fixed inset-0 bg-gray-900/30 z-40 lg:hidden transition-opacity duration-200',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />
      <aside
        id="sidebar"
        aria-label="Menu principal"
        className={cn(
          'flex flex-col gap-8 absolute z-40 left-0 top-0 lg:static lg:translate-x-0 h-dvh overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:w-64! 2xl:w-64! shrink-0 bg-white dark:bg-gray-800 p-4 rounded-r-2xl shadow-xs transition-all duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-64',
        )}
      >
        <Link to={workspaceId ? routes.workspace(workspaceId) : routes.workspaces} className="px-2 mt-1">
          <Logo nameClassName={hiddenWhenCollapsed} />
        </Link>

        <LinkButton
          to={routes.workspaces}
          variant="secondary"
          aria-label={`Trocar de workspace: ${workspace?.name ?? 'nenhum selecionado'}`}
          className={cn('justify-between w-full', 'lg:hidden lg:sidebar-expanded:inline-flex 2xl:inline-flex')}
        >
          <span className="truncate">{workspace?.name ?? 'Escolher workspace'}</span>
          <ChevronDownIcon className="text-gray-400 dark:text-gray-500" />
        </LinkButton>

        {workspaceId && (
          <nav aria-label="Navegação" className="flex flex-col gap-8">
            <ProjectLinks workspaceId={workspaceId} />
            <div>
              <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 pl-3 mb-3">Workspace</h2>
              <SideLink to={routes.members(workspaceId)} icon={UsersIcon}>
                Membros
              </SideLink>
            </div>
          </nav>
        )}

        <div className="hidden lg:flex 2xl:hidden justify-end mt-auto">
          <IconButton
            aria-label={sidebarExpanded ? 'Recolher menu' : 'Expandir menu'}
            aria-expanded={sidebarExpanded}
            onClick={toggleSidebarExpanded}
          >
            <ChevronsIcon className={sidebarExpanded ? 'rotate-180' : undefined} />
          </IconButton>
        </div>
      </aside>
    </div>
  );
}
