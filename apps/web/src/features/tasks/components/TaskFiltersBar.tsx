import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@clickunicap/shared';
import { useEffect, useRef, useState } from 'react';
import { Button, FormField, Input, Select } from '@/components/ui';
import { useTaskFilters } from '@/hooks/useTaskFilters';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';

const SEARCH_DELAY_MS = 300;

export function TaskFiltersBar() {
  const { search, priority, assigneeId, hasFilters, setFilter, clearFilters } = useTaskFilters();
  const { data: members = [] } = useWorkspaceMembers();
  const [term, setTerm] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const changeTerm = (value: string) => {
    setTerm(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFilter('search', value.trim()), SEARCH_DELAY_MS);
  };

  const clear = () => {
    clearTimeout(timer.current);
    setTerm('');
    clearFilters();
  };

  return (
    <div role="search" aria-label="Filtrar tarefas" className="flex flex-wrap items-end gap-3 mb-6">
      <div className="grow basis-60 max-w-90">
        <FormField label="Buscar por título">
          {(control) => (
            <Input
              {...control}
              type="search"
              placeholder="Ex.: Kanban"
              value={term}
              onChange={(event) => changeTerm(event.target.value)}
            />
          )}
        </FormField>
      </div>
      <div className="basis-44">
        <FormField label="Prioridade">
          {(control) => (
            <Select {...control} value={priority} onChange={(event) => setFilter('priority', event.target.value)}>
              <option value="">Todas</option>
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {TASK_PRIORITY_LABELS[value]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
      <div className="basis-52">
        <FormField label="Responsável">
          {(control) => (
            <Select {...control} value={assigneeId} onChange={(event) => setFilter('assigneeId', event.target.value)}>
              <option value="">Todos</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
      {hasFilters && (
        <Button variant="secondary" onClick={clear}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
