import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('bg-white dark:bg-gray-800 shadow-xs rounded-xl', className)} {...props} />;
}

export function CardHeader({ title, aside }: { title: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
      <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      {aside}
    </header>
  );
}

export function SectionLabel({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2 className={cn('text-xs font-semibold uppercase text-gray-500 dark:text-gray-400', className)} {...props} />
  );
}
