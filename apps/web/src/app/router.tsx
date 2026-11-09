import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import { FullPageLoader } from '@/components/ui';
import { ProjectsPage } from '@/features/projects';
import { routes } from '@/lib/routes';
import { GuestOnly, RequireAuth } from './guards';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProjectIndexRedirect, WorkspaceIndexRedirect } from './layouts/redirects';
import { WorkspaceGate } from './layouts/WorkspaceGate';
import { NotFoundPage } from './pages/NotFoundPage';

const auth = () => import('@/features/auth');
const workspaces = () => import('@/features/workspaces');

const LoginPage = lazy(() => auth().then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => auth().then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => auth().then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => auth().then((m) => ({ default: m.ResetPasswordPage })));
const ProfilePage = lazy(() => auth().then((m) => ({ default: m.ProfilePage })));
const WorkspacesPage = lazy(() => workspaces().then((m) => ({ default: m.WorkspacesPage })));
const AcceptInvitePage = lazy(() => workspaces().then((m) => ({ default: m.AcceptInvitePage })));
const MembersPage = lazy(() => workspaces().then((m) => ({ default: m.MembersPage })));
const BoardPage = lazy(() => import('@/features/kanban').then((m) => ({ default: m.BoardPage })));
const TaskListPage = lazy(() => import('@/features/task-list').then((m) => ({ default: m.TaskListPage })));
const ProjectLayout = lazy(() => import('./layouts/ProjectLayout').then((m) => ({ default: m.ProjectLayout })));
const TaskDetailRoute = lazy(() => import('./layouts/TaskDetailRoute').then((m) => ({ default: m.TaskDetailRoute })));

const TASK_ROUTE = '/w/:workspaceId/t/:taskId';

export function AppRoutes() {
  const location = useLocation();
  // Aberto a partir de uma tela, o detalhe da tarefa aparece como modal e a tela continua por baixo
  const background = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes location={background ?? location}>
        <Route element={<GuestOnly />}>
          <Route element={<AuthLayout />}>
            <Route path={routes.login} element={<LoginPage />} />
            <Route path={routes.register} element={<RegisterPage />} />
          </Route>
        </Route>
        <Route element={<AuthLayout />}>
          <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />
          <Route path={routes.resetPassword} element={<ResetPasswordPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AuthLayout />}>
            <Route path={routes.acceptInvite} element={<AcceptInvitePage />} />
          </Route>
          <Route element={<AuthLayout width="lg" />}>
            <Route path={routes.workspaces} element={<WorkspacesPage />} />
          </Route>
          <Route element={<AppLayout />}>
            <Route path={routes.profile} element={<ProfilePage />} />
          </Route>
          <Route path="/w/:workspaceId" element={<WorkspaceGate />}>
            <Route element={<AppLayout />}>
              <Route index element={<WorkspaceIndexRedirect />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="settings/members" element={<MembersPage />} />
              <Route path="p/:projectId" element={<ProjectLayout />}>
                <Route index element={<ProjectIndexRedirect />} />
                <Route path="board" element={<BoardPage />} />
                <Route path="list" element={<TaskListPage />} />
              </Route>
              <Route path="t/:taskId" element={<TaskDetailRoute />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to={routes.workspaces} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {background && (
        <Routes>
          <Route path={TASK_ROUTE} element={<TaskDetailRoute />} />
        </Routes>
      )}
    </Suspense>
  );
}
