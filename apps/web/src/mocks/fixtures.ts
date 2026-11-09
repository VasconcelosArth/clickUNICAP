import type { MemberWithUser, MyWorkspace, Project, Task, User, WorkspaceInvite } from '@clickunicap/shared';

const CREATED_AT = '2026-11-04T12:00:00.000Z';

export const ids = {
  user: '11111111-1111-4111-8111-111111111111',
  otherUser: '22222222-2222-4222-8222-222222222222',
  workspace: '33333333-3333-4333-8333-333333333333',
  project: '44444444-4444-4444-8444-444444444444',
  task: '55555555-5555-4555-8555-555555555555',
  invite: '66666666-6666-4666-8666-666666666666',
};

export const user: User = {
  id: ids.user,
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  avatarUrl: null,
  createdAt: CREATED_AT,
};

export const workspace: MyWorkspace = {
  id: ids.workspace,
  name: 'Time ClickUNICAP',
  ownerId: ids.user,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  myRole: 'admin',
};

export const members: MemberWithUser[] = [
  {
    workspaceId: ids.workspace,
    userId: ids.user,
    role: 'admin',
    joinedAt: CREATED_AT,
    name: 'Ana Souza',
    email: 'ana@exemplo.com',
    avatarUrl: null,
    isOwner: true,
  },
  {
    workspaceId: ids.workspace,
    userId: ids.otherUser,
    role: 'member',
    joinedAt: CREATED_AT,
    name: 'Bruno Lima',
    email: 'bruno@exemplo.com',
    avatarUrl: null,
    isOwner: false,
  },
];

export const invite: WorkspaceInvite = {
  id: ids.invite,
  workspaceId: ids.workspace,
  email: 'carla@exemplo.com',
  role: 'member',
  invitedBy: ids.user,
  expiresAt: '2026-11-16T12:00:00.000Z',
  createdAt: CREATED_AT,
};

export const project: Project = {
  id: ids.project,
  workspaceId: ids.workspace,
  name: 'MVP ClickUNICAP',
  description: 'Base do sistema',
  color: '#8470ff',
  archivedAt: null,
  createdBy: ids.user,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

export const task: Task = {
  id: ids.task,
  projectId: ids.project,
  title: 'Setup do apps/web',
  description: 'Criar o projeto',
  status: 'in_progress',
  priority: 'urgent',
  assigneeId: ids.user,
  startDate: null,
  dueDate: '2099-11-11',
  position: 1,
  createdBy: ids.user,
  completedAt: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};
