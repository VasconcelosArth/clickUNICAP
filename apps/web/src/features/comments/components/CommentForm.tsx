import { createCommentSchema, type CreateCommentInput } from '@clickunicap/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Alert, Avatar, Button, FormField, Textarea } from '@/components/ui';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { cn } from '@/lib/utils';
import {
  filterMembers,
  findMentionQuery,
  insertMention,
  mentionsToDisplay,
  mentionsToStored,
  type MentionQuery,
} from '../utils/mentions';

interface CommentFormProps {
  label: string;
  submitLabel: string;
  /** Texto no formato gravado (`@[userId]`). */
  initialBody?: string;
  pending?: boolean;
  error?: string;
  /** Recebe o texto no formato gravado. `onDone` limpa o campo; o pai chama quando a API aceitou. */
  onSubmit: (body: string, onDone: () => void) => void;
  onCancel?: () => void;
}

/** O campo guarda o texto editável (`@Nome`); a validação e o envio usam o formato gravado (`@[userId]`). */
type CommentFormValues = { body: string };

const MAX_SUGGESTIONS = 8;

export function CommentForm({
  label,
  submitLabel,
  initialBody = '',
  pending,
  error,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const { data } = useWorkspaceMembers();
  const members = useMemo(() => data ?? [], [data]);
  const membersRef = useRef(members);
  membersRef.current = members;

  const resolver = useMemo<Resolver<CommentFormValues, unknown, CreateCommentInput>>(() => {
    const validate = zodResolver(createCommentSchema);
    return (values, context, options) =>
      validate({ body: mentionsToStored(values.body, membersRef.current) }, context, options);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<CommentFormValues, unknown, CreateCommentInput>({
    resolver,
    defaultValues: { body: mentionsToDisplay(initialBody, members) },
  });

  // A lista de membros pode chegar depois do formulário: troca os ids pelos nomes enquanto ninguém digitou.
  useEffect(() => {
    if (!isDirty) reset({ body: mentionsToDisplay(initialBody, members) });
  }, [members, initialBody, isDirty, reset]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mention, setMention] = useState<(MentionQuery & { caret: number }) | null>(null);
  const [active, setActive] = useState(0);
  const listId = useId();

  const suggestions = mention ? filterMembers(members, mention.query).slice(0, MAX_SUGGESTIONS) : [];
  const open = suggestions.length > 0;
  const activeIndex = Math.min(active, Math.max(suggestions.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${index}`;

  const refreshMention = (element: HTMLTextAreaElement) => {
    const caret = element.selectionStart;
    const found = findMentionQuery(element.value, caret);
    setMention((current) => {
      if (!found) return null;
      if (current?.start !== found.start) setActive(0);
      return { ...found, caret };
    });
  };

  const choose = (name: string) => {
    if (!mention) return;
    const next = insertMention(watch('body'), mention, mention.caret, name);
    setValue('body', next.text, { shouldDirty: true, shouldValidate: isSubmitted });
    setMention(null);
    const element = textareaRef.current;
    if (element) {
      element.focus();
      element.setSelectionRange(next.caret, next.caret);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((activeIndex - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const chosen = suggestions[activeIndex];
      if (chosen) choose(chosen.name);
    } else if (event.key === 'Escape') {
      // Fecha só a lista, sem fechar o modal da tarefa.
      event.preventDefault();
      event.stopPropagation();
      setMention(null);
    }
  };

  const submit = handleSubmit(({ body }) =>
    onSubmit(body, () => reset({ body: mentionsToDisplay(initialBody, membersRef.current) })),
  );

  const { ref: registerRef, onChange, onBlur, ...field } = register('body');

  return (
    // Fica dentro do <form> da tarefa (slot): por isso é uma <div> e o envio é pelo clique, não por submit.
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <FormField label={label} error={errors.body?.message} hint="Digite @ para mencionar alguém do workspace.">
        {(control) => (
          <div className="relative">
            <Textarea
              {...control}
              {...field}
              ref={(element) => {
                registerRef(element);
                textareaRef.current = element;
              }}
              rows={3}
              aria-autocomplete="list"
              aria-controls={open ? listId : undefined}
              aria-activedescendant={open ? optionId(activeIndex) : undefined}
              onChange={(event) => {
                void onChange(event);
                refreshMention(event.target);
              }}
              onClick={(event) => refreshMention(event.currentTarget)}
              onKeyUp={(event) => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) refreshMention(event.currentTarget);
              }}
              onKeyDown={onKeyDown}
              onBlur={(event) => {
                setMention(null);
                void onBlur(event);
              }}
            />
            {open && (
              <ul
                id={listId}
                role="listbox"
                aria-label="Membros para mencionar"
                className="z-10 absolute top-full left-0 min-w-56 max-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1"
              >
                {suggestions.map((member, index) => (
                  <li
                    key={member.userId}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === activeIndex}
                    // Não tira o foco do campo ao clicar.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(member.name)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      'flex items-center gap-2 py-1 px-3 cursor-pointer font-medium text-sm text-gray-600 dark:text-gray-300',
                      index === activeIndex && 'bg-gray-50 dark:bg-gray-700/20 text-gray-800 dark:text-gray-200',
                    )}
                  >
                    <span aria-hidden="true">
                      <Avatar name={member.name} avatarUrl={member.avatarUrl} />
                    </span>
                    <span className="truncate">{member.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </FormField>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button loading={pending} disabled={!watch('body').trim()} onClick={() => void submit()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
