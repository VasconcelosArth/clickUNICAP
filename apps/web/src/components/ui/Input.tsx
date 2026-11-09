import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const controlClasses =
  'w-full bg-white dark:bg-gray-900/30 border text-sm text-gray-800 dark:text-gray-100 leading-5 py-2 px-3 border-gray-200 hover:border-gray-300 focus:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 dark:focus:border-gray-600 shadow-xs rounded-lg focus:ring-0 focus-visible:ring-2 focus-visible:ring-violet-500/50 placeholder-gray-500 dark:placeholder-gray-400 aria-invalid:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClasses, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(controlClasses, 'pr-10', className)} {...props} />;
}

export function Checkbox({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'rounded-sm bg-white dark:bg-gray-900/30 text-violet-500 checked:bg-violet-500 checked:border-transparent border border-gray-300 dark:border-gray-700/60 focus:ring-0 focus-visible:ring-2 focus-visible:ring-violet-500/50',
        className,
      )}
      {...props}
    />
  );
}
