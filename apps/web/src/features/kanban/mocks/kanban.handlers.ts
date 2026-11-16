import type { MoveTaskInput } from '@clickunicap/shared';
import { http, HttpResponse } from 'msw';
import { task } from '@/mocks/fixtures';

export const kanbanHandlers = [
  http.post('*/tasks/:taskId/move', async ({ params, request }) => {
    const { status } = (await request.json()) as MoveTaskInput;
    return HttpResponse.json({ ...task, id: String(params.taskId), status });
  }),
];
