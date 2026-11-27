import { ACCEPTED_FILE_TYPES, formatFileSize, isPreviewable, validateFile } from './files';

function file(name: string, size: number) {
  const value = new File(['x'], name);
  Object.defineProperty(value, 'size', { value: size });
  return value;
}

describe('formatFileSize', () => {
  it('usa B, KB e MB no formato pt-BR', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(12_595)).toBe('12,3 KB');
    expect(formatFileSize(1_258_291)).toBe('1,2 MB');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
  });
});

describe('validateFile', () => {
  it('aceita os tipos do shared, sem diferenciar maiúsculas', () => {
    expect(validateFile(file('relatorio.PDF', 100))).toBeNull();
    expect(validateFile(file('foto.jpeg', 100))).toBeNull();
    expect(validateFile(file('planilha.xlsx', 100))).toBeNull();
  });

  it('recusa executáveis, arquivos sem extensão e tipos fora da lista', () => {
    expect(validateFile(file('setup.exe', 100))).toMatch(/tipo de arquivo não permitido/);
    expect(validateFile(file('script.bat', 100))).toMatch(/tipo de arquivo não permitido/);
    expect(validateFile(file('LEIAME', 100))).toMatch(/tipo de arquivo não permitido/);
    expect(validateFile(file('.pdf', 100))).toMatch(/tipo de arquivo não permitido/);
    expect(validateFile(file('pagina.html', 100))).toMatch(/tipo de arquivo não permitido/);
  });

  it('recusa arquivo vazio e acima do limite', () => {
    expect(validateFile(file('a.pdf', 0))).toMatch(/vazio/);
    expect(validateFile(file('a.pdf', 10 * 1024 * 1024))).toBeNull();
    expect(validateFile(file('a.pdf', 10 * 1024 * 1024 + 1))).toMatch(/passa do limite de 10 MB/);
    expect(validateFile(file('a.pdf', 2048), 1024)).toMatch(/passa do limite de 1 KB/);
  });
});

describe('isPreviewable', () => {
  it('só imagem e PDF', () => {
    expect(isPreviewable('image/png')).toBe(true);
    expect(isPreviewable('application/pdf')).toBe(true);
    expect(isPreviewable('text/plain')).toBe(false);
    expect(isPreviewable('image/svg+xml')).toBe(false);
  });
});

it('o seletor de arquivos aceita as extensões do shared', () => {
  expect(ACCEPTED_FILE_TYPES).toContain('.pdf');
  expect(ACCEPTED_FILE_TYPES).toContain('.pptx');
  expect(ACCEPTED_FILE_TYPES).not.toContain('.exe');
});
