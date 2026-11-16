import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Tela sem menu: autenticação, convite e lista de workspaces. */
export function AuthLayout({ width = 'sm' }: { width?: 'sm' | 'lg' }) {
  return (
    <div
      className={cn('min-h-dvh flex justify-center px-4 py-8', width === 'sm' ? 'items-center' : 'items-start pt-16')}
    >
      <main className={cn('w-full', width === 'sm' ? 'max-w-sm' : 'max-w-lg')}>
        <div className="mb-6">
          <Logo />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
