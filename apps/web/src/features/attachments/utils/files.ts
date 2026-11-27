import { ATTACHMENT_EXTENSIONS, ATTACHMENT_MAX_BYTES } from '@clickunicap/shared';

const ALLOWED = new Set<string>(ATTACHMENT_EXTENSIONS);
const PREVIEWABLE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']);

/** Valor do `accept` do seletor de arquivos. */
export const ACCEPTED_FILE_TYPES = ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(',');

const sizeFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Ex.: 512 B, 12,3 KB, 1,2 MB. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormat.format(bytes / 1024)} KB`;
  return `${sizeFormat.format(bytes / (1024 * 1024))} MB`;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

/**
 * Confere o arquivo antes de enviar, com as regras do `@clickunicap/shared`. O backend confere de novo (inclusive o
 * conteúdo): isto só evita esperar o envio para saber que vai falhar. Devolve a mensagem do erro ou `null`.
 */
export function validateFile(file: File, maxBytes = ATTACHMENT_MAX_BYTES): string | null {
  if (!ALLOWED.has(extensionOf(file.name))) {
    return `"${file.name}": tipo de arquivo não permitido.`;
  }
  if (file.size === 0) return `"${file.name}": o arquivo está vazio.`;
  if (file.size > maxBytes) {
    return `"${file.name}": passa do limite de ${formatFileSize(maxBytes)}.`;
  }
  return null;
}

/** Imagens e PDF abrem no preview; o resto só baixa. */
export function isPreviewable(mimeType: string): boolean {
  return PREVIEWABLE.has(mimeType);
}

/** Salva um Blob com o nome do anexo e libera o `blob:` URL. */
export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // O navegador já começou o download; revogar depois evita cancelar em navegadores mais lentos
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
