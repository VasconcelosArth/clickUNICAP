import type { Comment } from '@clickunicap/shared';
import { http, HttpResponse } from 'msw';
import { ids } from '@/mocks/fixtures';

const CREATED_AT = new Date().toISOString();

export const commentFixture: Comment = {
  id: '99999999-9999-4999-8999-999999999999',
  taskId: ids.task,
  authorId: ids.user,
  body: 'Primeiro comentário',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

export const commentsHandlers = [
  http.get('*/tasks/:taskId/comments', () => HttpResponse.json([])),
  http.post('*/tasks/:taskId/comments', async ({ request }) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({ ...commentFixture, ...body }, { status: 201 });
  }),
  http.patch('*/comments/:id', async ({ request }) => {
    const body = (await request.json()) as object;
    return HttpResponse.json({ ...commentFixture, ...body });
  }),
  http.delete('*/comments/:id', () => new HttpResponse(null, { status: 204 })),
];
