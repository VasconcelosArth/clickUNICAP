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

// O Blob do jsdom não tem arrayBuffer/text/stream. No Node 22, o MSW trava ao ler um arquivo enviado por
// XMLHttpRequest dentro de um FormData (upload de anexos); no Node 24 funciona. Completa com o FileReader do jsdom.
function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
    return readBlob(this);
  };
}
if (!Blob.prototype.text) {
  Blob.prototype.text = async function text(this: Blob) {
    return new TextDecoder().decode(await readBlob(this));
  };
}
if (!Blob.prototype.stream) {
  Blob.prototype.stream = function stream(this: Blob) {
    const bytes = readBlob(this);
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(new Uint8Array(await bytes));
        controller.close();
      },
    });
  } as Blob['stream'];
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  useWorkspaceStore.setState({ activeWorkspaceId: null });
  localStorage.clear();
});
afterAll(() => server.close());
