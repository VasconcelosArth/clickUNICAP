import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ids } from '@/mocks/fixtures';
import { useWorkspaceStore } from '@/stores/workspace.store';

/** Aparece quando a tela navega para outra rota, para o teste conferir o destino. */
function LocationProbe() {
  const { pathname, search } = useLocation();
  return (
    <p>
      Rota: {pathname}
      {search}
    </p>
  );
}

interface RenderOptions {
  route?: string;
  /** Padrão da rota com parâmetros, ex.: /w/:workspaceId/t/:taskId. */
  path?: string;
  workspaceId?: string | null;
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const { route = '/tela', path, workspaceId = ids.workspace } = options;
  useWorkspaceStore.setState({ activeWorkspaceId: workspaceId });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path ?? route.split('?')[0]} element={ui} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
