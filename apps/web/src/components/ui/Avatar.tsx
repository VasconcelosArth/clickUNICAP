import { cn, initials } from '@/lib/utils';

interface AvatarProps {
  /** Sem nome, mostra o estado "Sem responsável". */
  name?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'w-8 h-8 text-xs', lg: 'w-16 h-16 text-xl' };

export function Avatar({ name, avatarUrl, size = 'sm', className }: AvatarProps) {
  const classes = cn('rounded-full shrink-0', sizeClasses[size], className);

  if (name && avatarUrl) return <img src={avatarUrl} alt={name} title={name} className={cn(classes, 'object-cover')} />;

  return (
    <span
      role="img"
      aria-label={name ?? 'Sem responsável'}
      title={name ?? 'Sem responsável'}
      className={cn(
        classes,
        'flex items-center justify-center font-semibold',
        name
          ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300'
          : 'bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400',
      )}
    >
      {name ? initials(name) : '–'}
    </span>
  );
}
