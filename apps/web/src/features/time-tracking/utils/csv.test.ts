import type { TimeReport } from '@clickunicap/shared';
import { csvCell, downloadCsv, timeReportFileName, timeReportToCsv } from './csv';

const uuid = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

describe('csvCell', () => {
  it('deixa texto simples e números como estão', () => {
    expect(csvCell('Ana Souza')).toBe('Ana Souza');
    expect(csvCell(90)).toBe('90');
  });

  it('põe entre aspas o texto com separador, aspas ou quebra de linha', () => {
    expect(csvCell('Vitrine; parte 1')).toBe('"Vitrine; parte 1"');
    expect(csvCell('O "acervo"')).toBe('"O ""acervo"""');
    expect(csvCell('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"');
  });

  it('não deixa a planilha executar texto como fórmula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@soma')).toBe("'@soma");
  });
});

describe('timeReportToCsv', () => {
  it('uma linha por membro e por tarefa, e o total no fim, com horas decimais', () => {
    const report: TimeReport = {
      from: '2026-11-01T03:00:00.000Z',
      to: '2026-12-01T03:00:00.000Z',
      totalMinutes: 135,
      byMember: [
        { userId: uuid, userName: 'Ana Souza', minutes: 90 },
        { userId: uuid, userName: 'Bruno Lima', minutes: 45 },
      ],
      byTask: [{ taskId: uuid, taskTitle: 'Montar a vitrine; fase 1', minutes: 135 }],
    };

    expect(timeReportToCsv(report)).toBe(
      [
        'Agrupamento;Nome;Minutos;Horas',
        'Membro;Ana Souza;90;1,50',
        'Membro;Bruno Lima;45;0,75',
        'Tarefa;"Montar a vitrine; fase 1";135;2,25',
        'Total;;135;2,25',
        '',
      ].join('\r\n'),
    );
  });
});

describe('timeReportFileName', () => {
  it('leva o período da tela', () => {
    expect(timeReportFileName({ from: '2026-11-01', to: '2026-11-30' })).toBe('horas-2026-11-01-a-2026-11-30.csv');
  });
});

/** O Blob do jsdom não tem arrayBuffer(): lê pelo FileReader. */
function readBytes(blob: Blob | undefined): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (!blob) return reject(new Error('Nenhum arquivo gerado'));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o arquivo'));
    reader.readAsArrayBuffer(blob);
  });
}

describe('downloadCsv', () => {
  // O jsdom não implementa URL.createObjectURL
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    vi.restoreAllMocks();
  });

  it('baixa o arquivo com o nome dado e BOM para o Excel abrir em UTF-8', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((value: Blob | MediaSource) => {
      if (value instanceof Blob) blobs.push(value);
      return 'blob:relatorio';
    });
    const revoke = vi.fn();
    URL.revokeObjectURL = revoke;
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });

    downloadCsv('horas.csv', 'a;b\r\n');

    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toBe('horas.csv');
    expect(clicked[0]?.href).toBe('blob:relatorio');
    expect(clicked[0]?.isConnected).toBe(false);
    expect(blobs[0]?.type).toBe('text/csv;charset=utf-8');
    const bytes = new Uint8Array(await readBytes(blobs[0]));
    expect([...bytes]).toEqual([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('a;b\r\n')]);
    await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:relatorio'));
  });
});
