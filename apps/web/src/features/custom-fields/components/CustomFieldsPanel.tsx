import type { CustomField, CustomFieldType } from '@clickunicap/shared';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  ConfirmAction,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import type { TaskSlotProps } from '@/app/slots/task-detail-slots';
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';
import { ApiError } from '@/lib/api-client';
import {
  useCreateCustomField,
  useDeleteCustomField,
  useProjectArchived,
  useProjectCustomFields,
  useTaskCustomFieldValues,
  useUpdateCustomField,
  useUpdateTaskCustomFieldValues,
} from '../api/custom-fields.queries';
import type { CustomFieldValue, CustomFieldValues } from '../api/custom-fields.api';

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'dropdown', label: 'Lista suspensa' },
  { value: 'checkbox', label: 'Caixa de seleção' },
];

const TYPE_LABELS = Object.fromEntries(FIELD_TYPES.map((type) => [type.value, type.label])) as Record<
  CustomFieldType,
  string
>;

function parseOptions(value: string): string[] {
  return value
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);
}

interface FieldManagerProps {
  projectId: string;
  fields: CustomField[];
}

function FieldManager({ projectId, fields }: FieldManagerProps) {
  const create = useCreateCustomField(projectId);
  const update = useUpdateCustomField(projectId);
  const remove = useDeleteCustomField(projectId);
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOptions, setEditOptions] = useState('');
  const [editRequired, setEditRequired] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutationError = create.error ?? update.error ?? remove.error;

  const submitCreate = () => {
    const cleanName = name.trim();
    const cleanOptions = parseOptions(options);
    if (!cleanName) {
      setValidationError('Informe o nome do campo.');
      return;
    }
    if (type === 'dropdown' && cleanOptions.length === 0) {
      setValidationError('Adicione pelo menos uma opção para a lista suspensa.');
      return;
    }
    setValidationError(null);
    create.mutate(
      {
        name: cleanName,
        type,
        isRequired: required,
        ...(type === 'dropdown' ? { options: cleanOptions } : {}),
      },
      {
        onSuccess: () => {
          setName('');
          setType('text');
          setOptions('');
          setRequired(false);
        },
      },
    );
  };

  const startEdit = (field: CustomField) => {
    setEditingId(field.id);
    setEditName(field.name);
    setEditOptions(field.options?.join('\n') ?? '');
    setEditRequired(field.isRequired);
    setValidationError(null);
    update.reset();
    remove.reset();
  };

  const submitEdit = (field: CustomField) => {
    const cleanName = editName.trim();
    const cleanOptions = parseOptions(editOptions);
    if (!cleanName) {
      setValidationError('Informe o nome do campo.');
      return;
    }
    if (field.type === 'dropdown' && cleanOptions.length === 0) {
      setValidationError('A lista suspensa precisa ter pelo menos uma opção.');
      return;
    }
    setValidationError(null);
    update.mutate(
      {
        fieldId: field.id,
        input: {
          name: cleanName,
          isRequired: editRequired,
          ...(field.type === 'dropdown' ? { options: cleanOptions } : {}),
        },
      },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Configurar campos do projeto</h3>
        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
          Os campos criados aqui ficam disponíveis nas tarefas deste projeto.
        </p>
      </div>

      {(validationError || mutationError) && <Alert>{validationError ?? mutationError?.message}</Alert>}

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100">Adicionar campo</h4>
        <FormField label="Nome do campo">
          {(control) => (
            <Input {...control} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
          )}
        </FormField>
        <FormField label="Tipo">
          {(control) => (
            <Select {...control} value={type} onChange={(event) => setType(event.target.value as CustomFieldType)}>
              {FIELD_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        {type === 'dropdown' && (
          <FormField label="Opções" hint="Digite uma opção por linha.">
            {(control) => (
              <Textarea {...control} rows={3} value={options} onChange={(event) => setOptions(event.target.value)} />
            )}
          </FormField>
        )}
        <FormField label="Obrigatório">
          {(control) => (
            <Checkbox {...control} checked={required} onChange={(event) => setRequired(event.target.checked)} />
          )}
        </FormField>
        <Button onClick={submitCreate} loading={create.isPending} disabled={!name.trim()}>
          Adicionar campo
        </Button>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700/60 pt-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100">Campos existentes</h4>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Ainda não há campos personalizados neste projeto.</p>
        ) : (
          <ul className="space-y-3">
            {fields.map((field) => (
              <li key={field.id} className="rounded-lg bg-gray-50 dark:bg-gray-900/30 p-3 space-y-3">
                {editingId === field.id ? (
                  <>
                    <FormField label="Nome">
                      {(control) => (
                        <Input
                          {...control}
                          value={editName}
                          maxLength={80}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                      )}
                    </FormField>
                    {field.type === 'dropdown' && (
                      <FormField
                        label="Opções"
                        hint="Uma opção por linha. Opções já usadas em tarefas não podem ser removidas."
                      >
                        {(control) => (
                          <Textarea
                            {...control}
                            rows={3}
                            value={editOptions}
                            onChange={(event) => setEditOptions(event.target.value)}
                          />
                        )}
                      </FormField>
                    )}
                    <FormField label="Obrigatório">
                      {(control) => (
                        <Checkbox
                          {...control}
                          checked={editRequired}
                          onChange={(event) => setEditRequired(event.target.checked)}
                        />
                      )}
                    </FormField>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" loading={update.isPending} onClick={() => submitEdit(field)}>
                        Salvar edição
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{field.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {TYPE_LABELS[field.type]}
                        {field.isRequired ? ' · Obrigatório' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(field)}>
                        Editar
                      </Button>
                      <ConfirmAction
                        label="Excluir"
                        ariaLabel={`Excluir campo ${field.name}`}
                        question={`Excluir o campo "${field.name}" e os valores salvos nas tarefas?`}
                        confirmLabel="Excluir campo"
                        pending={remove.isPending && remove.variables === field.id}
                        onConfirm={() => remove.mutate(field.id, { onSuccess: () => setEditingId(null) })}
                        triggerProps={{ variant: 'danger', size: 'sm' }}
                      />
                    </div>
                  </div>
                )}
                {field.type === 'dropdown' && editingId !== field.id && field.options && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Opções: {field.options.join(', ')}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function valueFor(field: CustomField, values: CustomFieldValues): CustomFieldValue {
  const value = values[field.id];
  if (value !== undefined && Object.prototype.hasOwnProperty.call(values, field.id)) return value;
  return field.type === 'checkbox' ? false : null;
}

/** Mesma regra da API: obrigatório não aceita vazio, e checkbox obrigatório precisa estar marcado. */
function missingRequired(field: CustomField, value: CustomFieldValue): string | null {
  if (!field.isRequired) return null;
  if (field.type === 'checkbox') return value === true ? null : 'Obrigatório: marque este campo.';
  if (value === null || (typeof value === 'string' && !value.trim())) return 'Obrigatório: preencha este campo.';
  return null;
}

/** Slot principal do detalhe da tarefa: edição dos valores e configuração dos campos do projeto (admin). */
export function CustomFieldsPanel({ taskId, projectId }: TaskSlotProps) {
  const { isAdmin } = useCurrentWorkspace();
  const archived = useProjectArchived(projectId);
  const fieldsQuery = useProjectCustomFields(projectId);
  const valuesQuery = useTaskCustomFieldValues(taskId);
  const saveValues = useUpdateTaskCustomFieldValues(taskId, projectId);
  const [values, setValues] = useState<CustomFieldValues>({});
  /** Só os campos alterados vão para a API: um obrigatório vazio que ninguém mexeu não trava os outros. */
  const [changed, setChanged] = useState<ReadonlySet<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [managing, setManaging] = useState(false);
  const dirty = changed.size > 0;

  useEffect(() => {
    setValues(valuesQuery.data ?? {});
    setChanged(new Set());
    setFieldErrors({});
  }, [taskId, valuesQuery.data]);

  if (fieldsQuery.isPending || valuesQuery.isPending) {
    return (
      <div role="status" aria-label="Carregando campos personalizados" className="space-y-2">
        <Skeleton className="h-8" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  const loadError = fieldsQuery.error ?? valuesQuery.error;
  if (loadError) {
    return (
      <ErrorState
        message={loadError.message}
        onRetry={() => {
          void fieldsQuery.refetch();
          void valuesQuery.refetch();
        }}
      />
    );
  }

  const fields = fieldsQuery.data ?? [];
  const changeValue = (fieldId: string, value: CustomFieldValue) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setChanged((current) => new Set(current).add(fieldId));
    setFieldErrors(({ [fieldId]: _removed, ...rest }) => rest);
    saveValues.reset();
  };

  const submitValues = () => {
    const changedFields = fields.filter((field) => changed.has(field.id));
    const errors: Record<string, string> = {};
    for (const field of changedFields) {
      const error = missingRequired(field, valueFor(field, values));
      if (error) errors[field.id] = error;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const submitted = Object.fromEntries(changedFields.map((field) => [field.id, valueFor(field, values)]));
    saveValues.mutate(submitted, {
      onSuccess: () => setChanged(new Set()),
      onError: (error) => {
        // A API recusa com REQUIRED_FIELD e o nome do campo na mensagem: mostra o erro no campo também.
        if (!(error instanceof ApiError) || error.error !== 'REQUIRED_FIELD') return;
        const field = changedFields.find((item) => error.message.includes(`"${item.name}"`));
        if (field) setFieldErrors({ [field.id]: error.message });
      },
    });
  };

  return (
    <section className="space-y-4" aria-labelledby="custom-fields-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="custom-fields-heading" className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Campos personalizados
        </h2>
        {isAdmin && !archived && (
          <Button size="sm" variant="secondary" onClick={() => setManaging((open) => !open)}>
            {managing ? 'Fechar configuração' : 'Gerenciar campos'}
          </Button>
        )}
      </div>

      {archived && (
        <p className="rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300">
          Projeto arquivado: os campos personalizados ficam somente para leitura.
        </p>
      )}
      {managing && isAdmin && !archived && <FieldManager projectId={projectId} fields={fields} />}
      {saveValues.error && <Alert>{saveValues.error.message}</Alert>}
      {saveValues.isSuccess && !dirty && <Alert tone="success">Valores dos campos salvos.</Alert>}

      {fields.length === 0 ? (
        <EmptyState
          title="Nenhum campo personalizado"
          description={
            isAdmin && !archived
              ? 'Use “Gerenciar campos” para criar campos para este projeto.'
              : 'Este projeto ainda não possui campos personalizados.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => {
            const value = valueFor(field, values);
            const fieldProps = {
              label: field.name,
              hint: field.isRequired ? 'Obrigatório' : undefined,
              error: fieldErrors[field.id],
            };
            if (field.type === 'checkbox') {
              return (
                <FormField key={field.id} {...fieldProps}>
                  {(control) => (
                    <Checkbox
                      {...control}
                      disabled={archived}
                      checked={value === true}
                      onChange={(event) => changeValue(field.id, event.target.checked)}
                    />
                  )}
                </FormField>
              );
            }
            if (field.type === 'dropdown') {
              return (
                <FormField key={field.id} {...fieldProps}>
                  {(control) => (
                    <Select
                      {...control}
                      disabled={archived}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(event) => changeValue(field.id, event.target.value || null)}
                    >
                      <option value="">Selecione uma opção</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  )}
                </FormField>
              );
            }
            const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
            const inputValue =
              field.type === 'number'
                ? typeof value === 'number'
                  ? String(value)
                  : ''
                : typeof value === 'string'
                  ? value
                  : '';
            return (
              <FormField key={field.id} {...fieldProps}>
                {(control) => (
                  <Input
                    {...control}
                    type={inputType}
                    disabled={archived}
                    value={inputValue}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (field.type === 'number') changeValue(field.id, next === '' ? null : Number(next));
                      else changeValue(field.id, next === '' && field.type === 'date' ? null : next);
                    }}
                  />
                )}
              </FormField>
            );
          })}
        </div>
      )}

      {fields.length > 0 && !archived && (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-gray-700/60 pt-4">
          <Button onClick={submitValues} loading={saveValues.isPending} disabled={!dirty}>
            Salvar campos
          </Button>
          {dirty && <p className="text-xs text-gray-500 dark:text-gray-400">Há alterações não salvas.</p>}
        </div>
      )}
    </section>
  );
}
