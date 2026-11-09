import { useId, type ReactNode } from 'react';

interface ControlProps {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
}

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** Recebe os atributos que ligam o controle ao rótulo e à mensagem de erro. */
  children: (control: ControlProps) => ReactNode;
}

export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs mt-1 text-red-800 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
