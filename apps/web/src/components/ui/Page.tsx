import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Área de conteúdo das telas logadas. `wide` ocupa toda a largura (Kanban). */
export function Page({ wide, children }: { wide?: boolean; children: ReactNode }) {
  return <div className={cn('px-4 sm:px-6 lg:px-8 py-8 w-full mx-auto', !wide && 'max-w-9xl')}>{children}</div>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{children}</h1>;
}

export function PageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="sm:flex sm:justify-between sm:items-center mb-8">
      <div className="mb-4 sm:mb-0">
        <PageTitle>{title}</PageTitle>
      </div>
      {actions && (
        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
