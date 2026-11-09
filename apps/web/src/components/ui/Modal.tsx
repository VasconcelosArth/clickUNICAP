import { useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { CSSTransition } from 'react-transition-group';
import { cn } from '@/lib/utils';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  footer?: ReactNode;
  children: ReactNode;
}

const sizeClasses = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' };
const TRANSITION_MS = 200;
const transitionClasses = {
  appear: 'opacity-0 translate-y-4',
  appearActive: 'transition ease-in-out duration-200 motion-reduce:transition-none opacity-100! translate-y-0!',
  enter: 'opacity-0 translate-y-4',
  enterActive: 'transition ease-in-out duration-200 motion-reduce:transition-none opacity-100! translate-y-0!',
  exitActive: 'transition ease-in-out duration-200 motion-reduce:transition-none opacity-0 translate-y-4',
};

/** Usa o `<dialog>` nativo, que já prende o foco e fecha com Esc. */
export function Modal({ open, onClose, title, size = 'lg', footer, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const showDialog = () => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  };

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <CSSTransition
      in={open}
      nodeRef={dialogRef}
      timeout={TRANSITION_MS}
      classNames={transitionClasses}
      appear
      mountOnEnter
      unmountOnExit
      onEnter={showDialog}
    >
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={closeOnBackdrop}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        className={cn(
          'mx-auto mt-16 mb-4 w-full p-4 bg-transparent text-gray-600 dark:text-gray-400 backdrop:bg-gray-900/30',
          sizeClasses[size],
        )}
      >
        <div className="bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700/60 rounded-lg shadow-lg">
          <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 id={titleId} className="font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h2>
            <IconButton aria-label="Fechar" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </header>
          <div className="p-5">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700/60">
              {footer}
            </footer>
          )}
        </div>
      </dialog>
    </CSSTransition>
  );
}
