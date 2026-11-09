import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Botão só com ícone: o `aria-label` é obrigatório. */
type IconButtonProps = ComponentProps<'button'> & { 'aria-label': string };

export function IconButton({ className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:outline-none max-md:min-w-11 max-md:min-h-11',
        className,
      )}
      {...props}
    />
  );
}
