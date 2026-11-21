import type { CreateTaskDependencyInput, TaskDependencies } from '@clickunicap/shared';
import { http, HttpResponse } from 'msw';

const CREATED_AT = '2026-11-04T12:00:00.000Z';
const empty: TaskDependencies = { blockedBy: [], blocking: [] };

export const dependenciesHandlers = [
  http.get('*/tasks/:taskId/dependencies', () => HttpResponse.json(empty)),
  http.post('*/tasks/:taskId/dependencies', async ({ params, request }) => {
    const { dependsOnTaskId } = (await request.json()) as CreateTaskDependencyInput;
    return HttpResponse.json(
      { taskId: String(params.taskId), dependsOnTaskId, createdAt: CREATED_AT },
      { status: 201 },
    );
  }),
  http.delete('*/tasks/:taskId/dependencies/:dependsOnTaskId', () => new HttpResponse(null, { status: 204 })),
];
