import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

type IconProps = SVGProps<SVGSVGElement>;

function Icon16({ className, children, ...props }: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn('fill-current shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon16 {...props}>
      <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
    </Icon16>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <Icon16 {...props}>
      <path d="M14 3H8.4L7 1.6A2 2 0 0 0 5.6 1H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
    </Icon16>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon16 {...props}>
      <path d="M8 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1c-3.3 0-6 1.8-6 4v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1c0-2.2-2.7-4-6-4Z" />
    </Icon16>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon16 {...props}>
      <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M8 0a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1ZM8 13.5a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0v-.5a1 1 0 0 1 1-1ZM0 8a1 1 0 0 1 1-1h.5a1 1 0 0 1 0 2H1a1 1 0 0 1-1-1ZM13.5 8a1 1 0 0 1 1-1h.5a1 1 0 1 1 0 2h-.5a1 1 0 0 1-1-1Z" />
    </Icon16>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon16 {...props}>
      <path d="M7.019 1.985a1.55 1.55 0 0 0-.483-1.36 1.44 1.44 0 0 0-1.53-.277C2.056 1.553 0 4.5 0 7.9 0 12.352 3.648 16 8.1 16c3.407 0 6.246-2.058 7.51-4.963a1.446 1.446 0 0 0-.25-1.55 1.554 1.554 0 0 0-1.372-.502c-4.01.552-7.539-2.987-6.97-7ZM2 7.9C2 5.64 3.193 3.664 4.961 2.6 4.82 7.245 8.72 11.158 13.36 11.04 12.265 12.822 10.341 14 8.1 14 4.752 14 2 11.248 2 7.9Z" />
    </Icon16>
  );
}

export function ChevronsIcon(props: IconProps) {
  return (
    <Icon16 {...props}>
      <path d="M8.3 3.3 7 4.6 10.4 8 7 11.4l1.3 1.3L13 8 8.3 3.3ZM3.3 3.3 2 4.6 5.4 8 2 11.4l1.3 1.3L8 8 3.3 3.3Z" />
    </Icon16>
  );
}

export function ChevronDownIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={cn('fill-current shrink-0', className)}
      {...props}
    >
      <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
    </svg>
  );
}

export function CloseIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={cn('fill-current shrink-0', className)}
      {...props}
    >
      <path d="M7.4 6l4.3-4.3-1.4-1.4L6 4.6 1.7.3.3 1.7 4.6 6 .3 10.3l1.4 1.4L6 7.4l4.3 4.3 1.4-1.4z" />
    </svg>
  );
}

export function MenuIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('w-6 h-6 fill-current', className)} {...props}>
      <rect x="4" y="5" width="16" height="2" />
      <rect x="4" y="11" width="16" height="2" />
      <rect x="4" y="17" width="16" height="2" />
    </svg>
  );
}
