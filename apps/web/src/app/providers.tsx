import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { clearSession } from '@/hooks/useCurrentUser';
import { onSessionExpired } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';
import { useUiStore } from '@/stores/ui.store';

const queryClient = createQueryClient();

function useApplyTheme() {
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
}

function useClearSessionWhenExpired() {
  useEffect(() => onSessionExpired(() => clearSession(queryClient)), []);
}

export function Providers({ children }: { children: ReactNode }) {
  useApplyTheme();
  useClearSessionWhenExpired();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}
