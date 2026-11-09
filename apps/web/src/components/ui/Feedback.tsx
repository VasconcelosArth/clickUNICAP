import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/** Mensagem de erro ou de sucesso dentro de um formulário ou tela. */
export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-lg px-3 py-2 text-sm font-medium',
        tone === 'error'
          ? 'bg-red-500/20 text-red-800 dark:text-red-300'
          : 'bg-green-500/20 text-green-800 dark:text-green-300',
      )}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('animate-pulse bg-gray-200 dark:bg-gray-700/60 rounded-lg', className)} {...props} />;
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16" />
      ))}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div role="status" aria-label="Carregando" className="min-h-dvh flex items-center justify-center">
      <Skeleton className="w-12 h-12" />
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="py-12 text-center">
      <p className="font-semibold text-gray-800 dark:text-gray-100">Não foi possível carregar</p>
      <p className="text-sm mt-1">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
