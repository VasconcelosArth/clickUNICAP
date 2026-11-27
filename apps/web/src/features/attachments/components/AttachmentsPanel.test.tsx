import type { Attachment } from '@clickunicap/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ids, project, workspace } from '@/mocks/fixtures';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { attachmentFixtures, attachmentIds } from '../mocks/attachments.handlers';
import { AttachmentsPanel } from './AttachmentsPanel';

const uploaded: Attachment = {
  id: '88888888-8888-4888-8888-888888888888',
  taskId: ids.task,
  fileName: 'ata.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  uploadedBy: ids.user,
  createdAt: '2026-11-05T12:00:00.000Z',
};

function renderPanel() {
  return renderWithProviders(<AttachmentsPanel taskId={ids.task} projectId={ids.project} />);
}

/** Lista que muda com o envio e a remoção, como a API real. */
function useStatefulApi(initial: Attachment[] = attachmentFixtures) {
  let items = [...initial];
  const calls = { uploads: 0, deleted: [] as string[] };
  server.use(
    http.get('*/tasks/:taskId/attachments', () => HttpResponse.json(items)),
    http.post('*/tasks/:taskId/attachments', () => {
      calls.uploads += 1;
      items = [...items, uploaded];
      return HttpResponse.json(uploaded, { status: 201 });
    }),
    http.delete('*/attachments/:id', ({ params }) => {
      calls.deleted.push(String(params.id));
      items = items.filter((item) => item.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return calls;
}

function pdfFile(name = 'ata.pdf', size = 2048) {
  const file = new File(['%PDF-1.7'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:teste'), revokeObjectURL: vi.fn() }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AttachmentsPanel', () => {
  it('lista nome, tamanho, quem enviou e a data, com preview só para imagem e PDF', async () => {
    renderPanel();

    const list = await screen.findByRole('list', { name: /anexos/i });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText('briefing.pdf')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('240 KB')).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/Ana Souza/)).toBeInTheDocument();
    expect(within(rows[0]!).getByText('4 nov 2026')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('1,2 MB')).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/Bruno Lima/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visualizar briefing.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visualizar wireframe.png' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Visualizar orcamento.xlsx' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar orcamento.xlsx' })).toBeInTheDocument();
  });

  it('mostra o carregamento e depois o estado vazio', async () => {
    useStatefulApi([]);
    renderPanel();

    expect(screen.getByRole('status', { name: 'Carregando anexos' })).toBeInTheDocument();
    expect(await screen.findByText('Nenhum anexo nesta tarefa.')).toBeInTheDocument();
  });

  it('mostra o erro da API e tenta de novo', async () => {
    let fail = true;
    server.use(
      http.get('*/tasks/:taskId/attachments', () =>
        fail
          ? HttpResponse.json({ statusCode: 500, error: 'INTERNAL_ERROR', message: 'Falhou' }, { status: 500 })
          : HttpResponse.json([]),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou');
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhum anexo nesta tarefa.')).toBeInTheDocument();
  });

  it('envia pelo botão e o arquivo entra na lista', async () => {
    const calls = useStatefulApi([]);
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Nenhum anexo nesta tarefa.');

    await user.upload(screen.getByLabelText('Anexar arquivos'), pdfFile());

    const list = await screen.findByRole('list', { name: 'Anexos (1)' });
    expect(within(list).getByText('ata.pdf')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
    expect(calls.uploads).toBe(1);
  });

  it('mostra o progresso enquanto envia', async () => {
    let release = () => {};
    server.use(
      http.post('*/tasks/:taskId/attachments', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(uploaded, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole('list', { name: /anexos/i });

    await user.upload(screen.getByLabelText('Anexar arquivos'), pdfFile());

    const progress = await screen.findByRole('progressbar', { name: 'Enviando ata.pdf' });
    expect(progress).toHaveAttribute('aria-valuenow', '0');
    release();
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  });

  it('arrastar e soltar: destaca a área e envia o arquivo', async () => {
    const calls = useStatefulApi([]);
    renderPanel();
    await screen.findByText('Nenhum anexo nesta tarefa.');
    const dropzone = screen.getByRole('group', { name: 'Enviar anexos' });
    const dataTransfer = { types: ['Files'], files: [pdfFile()], dropEffect: 'none' };

    fireEvent.dragOver(dropzone, { dataTransfer });
    expect(screen.getByText('Solte para enviar')).toBeInTheDocument();
    expect(dropzone).toHaveClass('border-violet-500');

    fireEvent.drop(dropzone, { dataTransfer });

    const list = await screen.findByRole('list', { name: 'Anexos (1)' });
    expect(within(list).getByText('ata.pdf')).toBeInTheDocument();
    expect(calls.uploads).toBe(1);
    expect(screen.queryByText('Solte para enviar')).not.toBeInTheDocument();
  });

  it('recusa no cliente tipo não permitido, arquivo vazio e acima de 10 MB, sem chamar a API', async () => {
    const calls = useStatefulApi([]);
    renderPanel();
    await screen.findByText('Nenhum anexo nesta tarefa.');
    const files = [
      new File(['MZ'], 'virus.exe', { type: 'application/octet-stream' }),
      pdfFile('vazio.pdf', 0),
      pdfFile('grande.pdf', 10 * 1024 * 1024 + 1),
    ];

    fireEvent.drop(screen.getByRole('group', { name: 'Enviar anexos' }), { dataTransfer: { types: ['Files'], files } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('"virus.exe": tipo de arquivo não permitido.');
    expect(alert).toHaveTextContent('"vazio.pdf": o arquivo está vazio.');
    expect(alert).toHaveTextContent('"grande.pdf": passa do limite de 10 MB.');
    expect(calls.uploads).toBe(0);
  });

  it('mostra o erro do servidor no envio e permite dispensar', async () => {
    server.use(
      http.post('*/tasks/:taskId/attachments', () =>
        HttpResponse.json(
          { statusCode: 422, error: 'FILE_CONTENT_MISMATCH', message: 'O conteúdo do arquivo não corresponde ao tipo' },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole('list', { name: /anexos/i });

    await user.upload(screen.getByLabelText('Anexar arquivos'), pdfFile());

    expect(await screen.findByText(/Não foi enviado: O conteúdo do arquivo não corresponde/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dispensar o aviso de ata.pdf' }));
    expect(screen.queryByText(/Não foi enviado/)).not.toBeInTheDocument();
  });

  it('admin remove qualquer anexo depois de confirmar', async () => {
    const calls = useStatefulApi();
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('wireframe.png');

    await user.click(screen.getByRole('button', { name: 'Remover wireframe.png' }));
    await user.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(screen.queryByText('wireframe.png')).not.toBeInTheDocument());
    expect(calls.deleted).toEqual([attachmentIds.image]);
  });

  it('membro comum só vê Remover nos anexos que ele mesmo enviou', async () => {
    server.use(http.get('*/workspaces/:workspaceId', () => HttpResponse.json({ ...workspace, myRole: 'member' })));
    renderPanel();
    await screen.findByText('wireframe.png');

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Remover wireframe.png' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Remover briefing.pdf' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover orcamento.xlsx' })).not.toBeInTheDocument();
  });

  it('projeto arquivado: somente leitura, mas ainda baixa e visualiza', async () => {
    server.use(
      http.get('*/projects/:projectId', () =>
        HttpResponse.json({ ...project, archivedAt: '2026-11-09T12:00:00.000Z' }),
      ),
    );
    renderPanel();

    expect(await screen.findByText('Projeto arquivado: os anexos ficam somente leitura.')).toBeInTheDocument();
    await screen.findByText('briefing.pdf');
    expect(screen.queryByRole('group', { name: 'Enviar anexos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar briefing.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visualizar briefing.pdf' })).toBeInTheDocument();
  });

  it('baixa o arquivo como blob, com o nome do anexo', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('orcamento.xlsx');
      expect(this.href).toBe('blob:teste');
    });
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Baixar orcamento.xlsx' }));

    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('mostra o erro quando o download falha', async () => {
    server.use(
      http.get('*/attachments/:id/download', () =>
        HttpResponse.json(
          { statusCode: 404, error: 'NOT_FOUND', message: 'Arquivo do anexo não encontrado' },
          { status: 404 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Baixar orcamento.xlsx' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Arquivo do anexo não encontrado');
  });

  it('abre o preview da imagem e revoga o blob: URL ao fechar', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Visualizar wireframe.png' }));

    const image = await screen.findByRole('img', { name: 'wireframe.png' });
    expect(image).toHaveAttribute('src', 'blob:teste');
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByRole('img', { name: 'wireframe.png' })).not.toBeInTheDocument());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:teste');
  });

  it('abre o preview do PDF num iframe com o blob: URL', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Visualizar briefing.pdf' }));

    expect(await screen.findByTitle('Visualização de briefing.pdf')).toHaveAttribute('src', 'blob:teste');
  });

  it('mostra o erro no preview quando o arquivo não pode ser lido', async () => {
    server.use(
      http.get('*/attachments/:id/download', () =>
        HttpResponse.json(
          { statusCode: 404, error: 'NOT_FOUND', message: 'Arquivo do anexo não encontrado' },
          { status: 404 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'Visualizar wireframe.png' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Arquivo do anexo não encontrado');
    expect(screen.queryByRole('img', { name: 'wireframe.png' })).not.toBeInTheDocument();
  });
});
