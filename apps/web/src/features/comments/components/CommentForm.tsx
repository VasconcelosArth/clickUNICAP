import { createCommentSchema } from '@clickunicap/shared';
import { useState } from 'react';
import { Alert, Button, FormField, Select, Textarea } from '@/components/ui';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { appendMention } from '../utils/mentions';

interface CommentFormProps {
  label: string;
  submitLabel: string;
  initialBody?: string;
  pending?: boolean;
  error?: string;
  /** `onDone` limpa o campo; o pai chama quando a API aceitou. */
  onSubmit: (body: string, onDone: () => void) => void;
  onCancel?: () => void;
}

export function CommentForm({
  label,
  submitLabel,
  initialBody = '',
  pending,
  error,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const [body, setBody] = useState(initialBody);
  const { data: members = [] } = useWorkspaceMembers();

  const submit = () => {
    const parsed = createCommentSchema.safeParse({ body });
    if (parsed.success) onSubmit(parsed.data.body, () => setBody(initialBody));
  };

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <FormField label={label}>
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            maxLength={5000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        )}
      </FormField>
      <div className="flex items-end justify-between gap-3">
        <div className="w-56">
          <FormField label="Mencionar alguém">
            {(control) => (
              <Select
                {...control}
                value=""
                onChange={(event) =>
                  event.target.value && setBody((current) => appendMention(current, event.target.value))
                }
              >
                <option value="">Escolher membro</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button loading={pending} disabled={!body.trim()} onClick={submit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
