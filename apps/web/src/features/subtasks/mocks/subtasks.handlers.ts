import type { Subtask } from '@clickunicap/shared';
import { http, HttpResponse } from 'msw';
import { ids } from '@/mocks/fixtures';

const CREATED_AT = '2026-11-04T12:00:00.000Z';

export const subtaskFixture: Subtask = {
  id: '77777777-7777-4777-8777-777777777777',
  taskId: ids.task,
  title: 'Montar o layout',
  isDone: false,
  position: 1,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

export const subtasksHandlers = [
  http.get('*/tasks/:taskId/subtasks', () => HttpResponse.json([])),
  http.post('*/tasks/:taskId/subtasks', async ({ request }) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({ ...subtaskFixture, ...body }, { status: 201 });
  }),
  http.patch('*/subtasks/:id', async ({ request }) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({ ...subtaskFixture, ...body });
  }),
  http.delete('*/subtasks/:id', () => new HttpResponse(null, { status: 204 })),
];
