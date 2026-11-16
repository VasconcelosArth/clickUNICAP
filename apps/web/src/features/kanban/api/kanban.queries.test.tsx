import type { MoveTaskInput, Task, TaskStatus } from '@clickunicap/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { taskKeys } from '@/features/tasks';
import { ids, task } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { useMoveTask } from './kanban.queries';

const card = (id: string, status: TaskStatus): Task => ({ ...task, id, status });
const tasks = [card('a', 'todo'), card('b', 'todo'), card('c', 'in_progress')];
const listKey = taskKeys.list(ids.project, {});
const filteredKey = taskKeys.list(ids.project, { search: 'x' });

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(listKey, tasks);
  queryClient.setQueryData(filteredKey, [tasks[0]]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMoveTask(ids.project), { wrapper });
  const order = (key: readonly unknown[]) => queryClient.getQueryData<Task[]>(key)?.map((t) => `${t.id}:${t.status}`);
  return { result, order };
}

describe('useMoveTask', () => {
  it('manda o status e os vizinhos e move o cartão na hora em todas as listas do projeto', async () => {
    let body: MoveTaskInput | undefined;
    let movedId = '';
    // Segura a resposta para conferir o cache antes de a API responder
    let respond: () => void = () => undefined;
    server.use(
      http.post('*/tasks/:taskId/move', async ({ params, request }) => {
        movedId = String(params.taskId);
        body = (await request.json()) as MoveTaskInput;
        await new Promise<void>((resolve) => {
          respond = resolve;
        });
        return HttpResponse.json({ ...task, id: movedId, status: body.status });
      }),
    );
    const { result, order } = setup();
    const input: MoveTaskInput = { status: 'in_progress', beforeTaskId: null, afterTaskId: 'c' };

    act(() => result.current.mutate({ taskId: 'a', input }));

    await waitFor(() => expect(order(listKey)).toEqual(['b:todo', 'a:in_progress', 'c:in_progress']));
    expect(order(filteredKey)).toEqual(['a:in_progress']);
    await waitFor(() => expect(body).toEqual(input));
    expect(movedId).toBe('a');

    respond();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('desfaz o movimento e expõe a mensagem quando a API recusa', async () => {
    server.use(
      http.post('*/tasks/:taskId/move', () =>
        HttpResponse.json(
          { statusCode: 409, error: 'POSITION_CHANGED', message: 'O quadro mudou enquanto você movia a tarefa.' },
          { status: 409 },
        ),
      ),
    );
    const { result, order } = setup();

    act(() => result.current.mutate({ taskId: 'b', input: { status: 'done', beforeTaskId: null, afterTaskId: null } }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('O quadro mudou enquanto você movia a tarefa.');
    expect(order(listKey)).toEqual(['a:todo', 'b:todo', 'c:in_progress']);
  });
});
