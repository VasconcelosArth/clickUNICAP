import { http, HttpResponse } from 'msw';
import { invite, members, workspace } from '@/mocks/fixtures';

export const workspacesHandlers = [
  http.get('*/workspaces', () => HttpResponse.json([workspace])),
  http.post('*/workspaces', () => HttpResponse.json(workspace, { status: 201 })),
  http.get('*/workspaces/:workspaceId', () => HttpResponse.json(workspace)),
  http.get('*/workspaces/:workspaceId/members', () => HttpResponse.json(members)),
  http.patch('*/workspaces/:workspaceId/members/:userId', () => new HttpResponse(null, { status: 204 })),
  http.delete('*/workspaces/:workspaceId/members/:userId', () => new HttpResponse(null, { status: 204 })),
  http.get('*/workspaces/:workspaceId/invites', () => HttpResponse.json([invite])),
  http.post('*/workspaces/:workspaceId/invites', () => HttpResponse.json(invite, { status: 201 })),
  http.delete('*/workspaces/:workspaceId/invites/:inviteId', () => new HttpResponse(null, { status: 204 })),
  http.post('*/invites/accept', () => HttpResponse.json(workspace)),
];
