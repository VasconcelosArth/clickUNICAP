import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { server } from '@/mocks/server';
import { useWorkspaceStore } from '@/stores/workspace.store';

// O jsdom ainda não implementa os métodos do <dialog>
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open');
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  useWorkspaceStore.setState({ activeWorkspaceId: null });
  localStorage.clear();
});
afterAll(() => server.close());
