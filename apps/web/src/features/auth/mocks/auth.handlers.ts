import { http, HttpResponse } from 'msw';
import { user } from '@/mocks/fixtures';

export const authHandlers = [
  http.post('*/auth/login', () => HttpResponse.json({ user })),
  http.post('*/auth/register', () => HttpResponse.json({ user }, { status: 201 })),
  http.post('*/auth/refresh', () => HttpResponse.json({ user })),
  http.post('*/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.post('*/auth/forgot-password', () => new HttpResponse(null, { status: 204 })),
  http.post('*/auth/reset-password', () => new HttpResponse(null, { status: 204 })),
  http.get('*/users/me', () => HttpResponse.json(user)),
  http.patch('*/users/me', async ({ request }) =>
    HttpResponse.json({ ...user, ...((await request.json()) as object) }),
  ),
];
