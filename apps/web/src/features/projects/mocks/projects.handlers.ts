import { http, HttpResponse } from 'msw';
import { project } from '@/mocks/fixtures';

export const projectsHandlers = [
  http.get('*/projects', () => HttpResponse.json([project])),
  http.post('*/projects', () => HttpResponse.json(project, { status: 201 })),
  http.get('*/projects/:projectId', () => HttpResponse.json(project)),
  http.post('*/projects/:projectId/archive', () =>
    HttpResponse.json({ ...project, archivedAt: '2026-11-09T12:00:00.000Z' }),
  ),
  http.post('*/projects/:projectId/unarchive', () => HttpResponse.json(project)),
];
