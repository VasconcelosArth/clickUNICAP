import { Link } from 'react-router-dom';
import { Avatar, IconButton, MenuIcon, MoonIcon, SunIcon } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { routes } from '@/lib/routes';
import { useUiStore } from '@/stores/ui.store';

function ThemeToggle() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <IconButton
      aria-label={isDark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  );
}

export function Header() {
  const { data: user } = useCurrentUser();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  return (
    <header className="sticky top-0 z-30 before:absolute before:inset-0 before:backdrop-blur-md before:-z-10 max-lg:before:bg-white/90 dark:max-lg:before:bg-gray-800/90 lg:before:bg-gray-100/90 dark:lg:before:bg-gray-900/90 max-lg:shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:border-b border-gray-200 dark:border-gray-700/60">
          <button
            type="button"
            className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 lg:hidden"
            aria-label="Abrir menu"
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <MenuIcon />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <span aria-hidden="true" className="w-px h-6 bg-gray-200 dark:bg-gray-700/60" />
            {user && (
              <Link
                to={routes.profile}
                aria-label={`Abrir perfil de ${user.name}`}
                className="inline-flex items-center gap-2"
              >
                <Avatar name={user.name} avatarUrl={user.avatarUrl} />
                <span className="text-sm font-medium max-xs:hidden">{user.name}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
