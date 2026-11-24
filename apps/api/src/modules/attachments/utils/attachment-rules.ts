import { getExtension } from './sanitize-file-name';

export const DEFAULT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

interface SignaturePart {
  offset: number;
  bytes: readonly number[];
}

interface AllowedType {
  /** Canonical MIME type. This is what gets stored and served, never the client's value. */
  mimeType: string;
  /** Other MIME types browsers commonly send for the same extension. */
  acceptedMimeTypes: readonly string[];
  /** Alternatives; the content must match one of them (all parts of that alternative). */
  signatures?: readonly (readonly SignaturePart[])[];
  /** Plain-text formats: content must not contain NUL bytes. */
  textual?: boolean;
}

const ZIP: readonly (readonly SignaturePart[])[] = [[{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }]];

const ALLOWED_TYPES: Readonly<Record<string, AllowedType>> = {
  pdf: {
    mimeType: 'application/pdf',
    acceptedMimeTypes: ['application/pdf'],
    signatures: [[{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }]],
  },
  png: {
    mimeType: 'image/png',
    acceptedMimeTypes: ['image/png'],
    signatures: [[{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }]],
  },
  jpg: {
    mimeType: 'image/jpeg',
    acceptedMimeTypes: ['image/jpeg', 'image/jpg'],
    signatures: [[{ offset: 0, bytes: [0xff, 0xd8, 0xff] }]],
  },
  jpeg: {
    mimeType: 'image/jpeg',
    acceptedMimeTypes: ['image/jpeg', 'image/jpg'],
    signatures: [[{ offset: 0, bytes: [0xff, 0xd8, 0xff] }]],
  },
  gif: {
    mimeType: 'image/gif',
    acceptedMimeTypes: ['image/gif'],
    signatures: [
      [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }], // GIF87a
      [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }], // GIF89a
    ],
  },
  webp: {
    mimeType: 'image/webp',
    acceptedMimeTypes: ['image/webp'],
    signatures: [
      [
        { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
        { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
      ],
    ],
  },
  txt: { mimeType: 'text/plain', acceptedMimeTypes: ['text/plain'], textual: true },
  csv: {
    mimeType: 'text/csv',
    acceptedMimeTypes: ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
    textual: true,
  },
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    acceptedMimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    signatures: ZIP,
  },
  xlsx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    acceptedMimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    signatures: ZIP,
  },
  pptx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    acceptedMimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    signatures: ZIP,
  },
};

export type UploadRejection =
  'EMPTY_FILE' | 'FILE_TOO_LARGE' | 'TYPE_NOT_ALLOWED' | 'MIME_MISMATCH' | 'CONTENT_MISMATCH';

export type UploadValidation = { ok: true; mimeType: string } | { ok: false; reason: UploadRejection };

export interface UploadCandidate {
  /** Already sanitized file name. */
  fileName: string;
  /** MIME type declared by the client (untrusted). */
  declaredMimeType: string;
  content: Buffer;
}

const TEXT_SCAN_BYTES = 8000;

/**
 * Server-side validation of an upload: size, extension allow-list, declared MIME type
 * coherent with the extension, and file content coherent with the format.
 * On success returns the canonical MIME type to store.
 */
export function validateUpload(candidate: UploadCandidate, maxBytes: number): UploadValidation {
  const size = candidate.content.length;
  if (size === 0) return { ok: false, reason: 'EMPTY_FILE' };
  if (size > maxBytes) return { ok: false, reason: 'FILE_TOO_LARGE' };

  const extension = getExtension(candidate.fileName);
  const allowed = Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, extension) ? ALLOWED_TYPES[extension] : undefined;
  if (!allowed) return { ok: false, reason: 'TYPE_NOT_ALLOWED' };

  const declared = normalizeMimeType(candidate.declaredMimeType);
  if (!allowed.acceptedMimeTypes.includes(declared)) return { ok: false, reason: 'MIME_MISMATCH' };

  if (allowed.signatures && !matchesAnySignature(candidate.content, allowed.signatures)) {
    return { ok: false, reason: 'CONTENT_MISMATCH' };
  }
  if (allowed.textual && candidate.content.subarray(0, TEXT_SCAN_BYTES).includes(0)) {
    return { ok: false, reason: 'CONTENT_MISMATCH' };
  }

  return { ok: true, mimeType: allowed.mimeType };
}

export function allowedExtensions(): string[] {
  return Object.keys(ALLOWED_TYPES);
}

function normalizeMimeType(value: string): string {
  return (value.split(';')[0] ?? '').trim().toLowerCase();
}

function matchesAnySignature(content: Buffer, signatures: readonly (readonly SignaturePart[])[]): boolean {
  return signatures.some((parts) =>
    parts.every((part) => part.bytes.every((byte, index) => content[part.offset + index] === byte)),
  );
}
