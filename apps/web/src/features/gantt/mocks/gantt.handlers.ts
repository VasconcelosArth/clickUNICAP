import { http, HttpResponse } from 'msw';

export const ganttHandlers = [http.get('*/projects/:projectId/dependencies', () => HttpResponse.json([]))];
