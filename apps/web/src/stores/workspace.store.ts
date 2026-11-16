import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  activeWorkspaceId: string | null;
  setActiveWorkspace: (workspaceId: string | null) => void;
}

/** Workspace ativo: vai no header X-Workspace-Id e mantém o menu lateral em telas fora de /w/:id. */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspace: (activeWorkspaceId) => set({ activeWorkspaceId }),
    }),
    { name: 'active-workspace' },
  ),
);
