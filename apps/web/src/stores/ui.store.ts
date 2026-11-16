import { create } from 'zustand';

export type Theme = 'light' | 'dark';

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento a preferência só dura até recarregar a página
  }
}

interface UiState {
  theme: Theme;
  toggleTheme: () => void;
  /** Gaveta do menu no celular. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** Menu aberto ou recolhido em telas grandes. */
  sidebarExpanded: boolean;
  toggleSidebarExpanded: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readPreference('theme') === 'dark' ? 'dark' : 'light',
  toggleTheme: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    savePreference('theme', theme);
    set({ theme });
  },
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  sidebarExpanded: readPreference('sidebar-expanded') !== 'false',
  toggleSidebarExpanded: () => {
    const sidebarExpanded = !get().sidebarExpanded;
    savePreference('sidebar-expanded', String(sidebarExpanded));
    set({ sidebarExpanded });
  },
}));
