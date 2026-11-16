import { cn } from '@/lib/utils';

export function LogoMark() {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="9" className="fill-violet-500" />
      <path
        d="M9.5 16.5l4.5 4.5 8.5-9.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ nameClassName }: { nameClassName?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={cn('text-base font-bold text-gray-800 dark:text-gray-100', nameClassName)}>ClickUNICAP</span>
    </span>
  );
}
