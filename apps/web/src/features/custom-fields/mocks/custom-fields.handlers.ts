import { http, HttpResponse } from 'msw';

export const customFieldsHandlers = [
  http.get('*/projects/:projectId/custom-fields', () => HttpResponse.json([])),
  http.get('*/projects/:projectId/custom-field-values', () => HttpResponse.json({})),
  http.get('*/tasks/:taskId/custom-field-values', () => HttpResponse.json({})),
];
