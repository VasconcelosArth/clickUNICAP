import { EmptyState, LinkButton } from '@/components/ui';
import { routes } from '@/lib/routes';

export function NotFoundPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <EmptyState
        title="Página não encontrada"
        description="Ela não existe ou você não tem acesso a ela."
        action={<LinkButton to={routes.workspaces}>Ver meus workspaces</LinkButton>}
      />
    </div>
  );
}
