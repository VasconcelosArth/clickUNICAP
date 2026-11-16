import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link className={cn('font-medium text-violet-700 dark:text-violet-400 hover:underline', className)} {...props} />
  );
}
