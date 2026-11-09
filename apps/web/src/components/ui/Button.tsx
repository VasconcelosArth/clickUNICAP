import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'lg' | 'md' | 'sm' | 'xs';

const baseClasses =
  'font-medium text-sm inline-flex items-center justify-center gap-2 border border-transparent rounded-lg leading-5 shadow-xs whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-md:min-h-11';

const sizeClasses: Record<ButtonSize, string> = {
  lg: 'px-4 py-3',
  md: 'px-3 py-2',
  sm: 'px-2 py-1',
  xs: 'px-2 py-0.5',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white',
  secondary:
    'bg-white dark:bg-gray-800 border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300',
  danger: 'bg-red-800 text-white hover:bg-red-900',
  ghost: 'shadow-none text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50',
};

interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function buttonClasses({ variant = 'primary', size = 'md' }: ButtonStyle, className?: string): string {
  return cn(baseClasses, sizeClasses[size], variantClasses[variant], className);
}

export type ButtonProps = ComponentProps<'button'> & ButtonStyle & { loading?: boolean };

export function Button({ variant, size, loading, disabled, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size }, className)}
      {...props}
    />
  );
}

export function LinkButton({ variant, size, className, ...props }: LinkProps & ButtonStyle) {
  return <Link className={buttonClasses({ variant, size }, className)} {...props} />;
}
