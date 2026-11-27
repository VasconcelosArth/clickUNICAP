import { describe, expect, it } from 'vitest';
import { ATTACHMENT_EXTENSIONS, ATTACHMENT_MAX_BYTES, attachmentSchema } from './attachment.schema';

const uuid = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

const attachment = {
  id: uuid,
  taskId: uuid,
  fileName: 'relatório.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  uploadedBy: uuid,
  createdAt: '2026-11-27T12:00:00.000Z',
};

describe('attachmentSchema', () => {
  it('aceita os metadados de um anexo', () => {
    expect(attachmentSchema.parse(attachment)).toEqual(attachment);
  });

  it('não expõe o storageKey, mesmo que venha no objeto', () => {
    expect(attachmentSchema.parse({ ...attachment, storageKey: 'segredo' })).not.toHaveProperty('storageKey');
  });

  it('rejeita nome vazio, tamanho negativo ou quebrado e data fora do ISO', () => {
    expect(attachmentSchema.safeParse({ ...attachment, fileName: '' }).success).toBe(false);
    expect(attachmentSchema.safeParse({ ...attachment, sizeBytes: -1 }).success).toBe(false);
    expect(attachmentSchema.safeParse({ ...attachment, sizeBytes: 1.5 }).success).toBe(false);
    expect(attachmentSchema.safeParse({ ...attachment, createdAt: '27/11/2026' }).success).toBe(false);
  });
});

describe('regras de upload compartilhadas', () => {
  it('limite padrão de 10 MB', () => {
    expect(ATTACHMENT_MAX_BYTES).toBe(10 * 1024 * 1024);
  });

  it('aceita só tipos de documento e imagem, nunca executáveis', () => {
    expect(ATTACHMENT_EXTENSIONS).toContain('pdf');
    expect(ATTACHMENT_EXTENSIONS).toContain('png');
    expect(ATTACHMENT_EXTENSIONS).not.toContain('exe');
    expect(ATTACHMENT_EXTENSIONS).not.toContain('bat');
    expect(ATTACHMENT_EXTENSIONS).not.toContain('html');
    expect(ATTACHMENT_EXTENSIONS).not.toContain('svg');
  });
});
