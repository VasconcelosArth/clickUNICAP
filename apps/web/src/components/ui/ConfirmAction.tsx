import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from './Button';

interface ConfirmActionProps {
  /** Texto do botão que inicia a ação. */
  label: ReactNode;
  /** Nome acessível do botão, quando o texto sozinho não identifica o alvo. */
  ariaLabel?: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  triggerProps?: ButtonProps;
}

/** Pede confirmação na própria linha antes de uma ação que não dá para desfazer. */
export function ConfirmAction({
  label,
  ariaLabel,
  question,
  confirmLabel,
  onConfirm,
  pending,
  triggerProps,
}: ConfirmActionProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button aria-label={ariaLabel} onClick={() => setConfirming(true)} {...triggerProps}>
        {label}
      </Button>
    );
  }

  return (
    <div>
      <p role="alert" className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-100">
        {question}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
        <Button variant="danger" size="sm" loading={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
