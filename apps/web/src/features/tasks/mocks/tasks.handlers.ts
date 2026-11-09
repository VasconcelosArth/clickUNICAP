import { http, HttpResponse } from 'msw';
import { task } from '@/mocks/fixtures';

export const tasksHandlers = [
  http.get('*/projects/:projectId/tasks', () => HttpResponse.json([task])),
  http.post('*/projects/:projectId/tasks', () => HttpResponse.json(task, { status: 201 })),
  http.get('*/tasks/:taskId', () => HttpResponse.json(task)),
  http.patch('*/tasks/:taskId', async ({ request }) =>
    HttpResponse.json({ ...task, ...((await request.json()) as object) }),
  ),
  http.delete('*/tasks/:taskId', () => new HttpResponse(null, { status: 204 })),
];
