const MAX_FILE_NAME_LENGTH = 200;
const FALLBACK_FILE_NAME = 'file';

/**
 * Multer reads multipart file names as latin1, so accented names arrive garbled
 * (e.g. "relatório.pdf" becomes "relatÃ³rio.pdf"). Re-decodes as UTF-8 when that is safe.
 */
export function fixLatin1FileName(name: string): string {
  for (const char of name) {
    if ((char.codePointAt(0) ?? 0) > 255) return name; // already real Unicode
  }
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

/**
 * Returns a display-safe file name: no directories, no control characters,
 * no characters that are special in paths or headers, never empty.
 * The result is only metadata: it is never used to build a storage path.
 */
export function sanitizeFileName(rawName: string): string {
  const normalized = rawName.normalize('NFC');

  // Keep only the last path segment (handles both "/" and "\").
  const segments = normalized.split(/[\\/]/);
  const lastSegment = segments[segments.length - 1] ?? '';

  const cleaned = lastSegment
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[<>:"|?*\u202a-\u202e\u2066-\u2069]/g, '_') // reserved and bidi-override characters
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '') // no hidden files and no "..", "."
    .replace(/[. ]+$/, ''); // no trailing dots or spaces

  if (cleaned.length === 0) return FALLBACK_FILE_NAME;
  return truncatePreservingExtension(cleaned, MAX_FILE_NAME_LENGTH);
}

/** Lowercase extension without the dot, or an empty string. */
export function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return '';
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function truncatePreservingExtension(name: string, max: number): string {
  if (name.length <= max) return name;
  const extension = getExtension(name);
  if (extension.length === 0 || extension.length > 10) return name.slice(0, max);
  const keep = max - extension.length - 1;
  return `${name.slice(0, keep)}.${extension}`;
}
