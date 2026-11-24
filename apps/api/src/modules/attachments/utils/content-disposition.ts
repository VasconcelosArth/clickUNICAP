/**
 * Builds a `Content-Disposition: attachment` header value that is safe for any file name:
 * an ASCII fallback plus the RFC 5987 UTF-8 version (keeps accents in modern browsers).
 */
export function attachmentDisposition(fileName: string): string {
  const fallback =
    fileName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._ -]/g, '_') || 'file';
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
