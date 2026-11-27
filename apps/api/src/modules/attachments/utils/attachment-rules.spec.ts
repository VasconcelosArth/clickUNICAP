import { ATTACHMENT_EXTENSIONS, ATTACHMENT_MAX_BYTES } from '@clickunicap/shared';
import { DEFAULT_MAX_ATTACHMENT_BYTES, allowedExtensions, validateUpload } from './attachment-rules';

const PDF = Buffer.from('%PDF-1.7\n...');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const GIF = Buffer.from('GIF89a....');
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBPVP8 ')]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

const MAX = DEFAULT_MAX_ATTACHMENT_BYTES;

describe('validateUpload', () => {
  it.each([
    ['doc.pdf', 'application/pdf', PDF, 'application/pdf'],
    ['a.png', 'image/png', PNG, 'image/png'],
    ['a.jpg', 'image/jpeg', JPEG, 'image/jpeg'],
    ['a.JPEG', 'image/jpeg', JPEG, 'image/jpeg'],
    ['a.gif', 'image/gif', GIF, 'image/gif'],
    ['a.webp', 'image/webp', WEBP, 'image/webp'],
    ['notes.txt', 'text/plain', Buffer.from('olá mundo'), 'text/plain'],
    ['data.csv', 'text/csv', Buffer.from('a,b\n1,2'), 'text/csv'],
    ['data.csv', 'application/vnd.ms-excel', Buffer.from('a,b\n1,2'), 'text/csv'],
    [
      'a.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ZIP,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    [
      'a.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ZIP,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    [
      'a.pptx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ZIP,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  ])('accepts %s declared as %s', (fileName, declaredMimeType, content, expected) => {
    expect(validateUpload({ fileName, declaredMimeType, content }, MAX)).toEqual({
      ok: true,
      mimeType: expected,
    });
  });

  it('ignores MIME parameters and case', () => {
    const result = validateUpload(
      { fileName: 'n.txt', declaredMimeType: 'Text/Plain; charset=utf-8', content: Buffer.from('x') },
      MAX,
    );
    expect(result).toEqual({ ok: true, mimeType: 'text/plain' });
  });

  it('rejects an empty file', () => {
    expect(
      validateUpload({ fileName: 'a.pdf', declaredMimeType: 'application/pdf', content: Buffer.alloc(0) }, MAX),
    ).toEqual({ ok: false, reason: 'EMPTY_FILE' });
  });

  it('rejects a file above the limit but accepts one exactly at it', () => {
    const header = Buffer.from('%PDF-');
    const atLimit = Buffer.concat([header, Buffer.alloc(100 - header.length)]);
    const over = Buffer.concat([header, Buffer.alloc(101 - header.length)]);
    expect(validateUpload({ fileName: 'a.pdf', declaredMimeType: 'application/pdf', content: atLimit }, 100).ok).toBe(
      true,
    );
    expect(validateUpload({ fileName: 'a.pdf', declaredMimeType: 'application/pdf', content: over }, 100)).toEqual({
      ok: false,
      reason: 'FILE_TOO_LARGE',
    });
  });

  it.each(['run.exe', 'page.html', 'image.svg', 'script.js', 'noextension', 'a.pdf.exe', 'x.php'])(
    'rejects the extension of %s',
    (fileName) => {
      expect(validateUpload({ fileName, declaredMimeType: 'application/pdf', content: PDF }, MAX)).toEqual({
        ok: false,
        reason: 'TYPE_NOT_ALLOWED',
      });
    },
  );

  it('does not treat object prototype names as allowed extensions', () => {
    expect(
      validateUpload({ fileName: 'a.constructor', declaredMimeType: 'text/plain', content: Buffer.from('x') }, MAX),
    ).toEqual({ ok: false, reason: 'TYPE_NOT_ALLOWED' });
  });

  it('rejects a declared MIME type that does not match the extension', () => {
    expect(validateUpload({ fileName: 'a.pdf', declaredMimeType: 'text/html', content: PDF }, MAX)).toEqual({
      ok: false,
      reason: 'MIME_MISMATCH',
    });
    expect(
      validateUpload({ fileName: 'a.png', declaredMimeType: 'application/octet-stream', content: PNG }, MAX),
    ).toEqual({ ok: false, reason: 'MIME_MISMATCH' });
  });

  it('rejects content that does not match the format (disguised file)', () => {
    expect(
      validateUpload(
        { fileName: 'fake.png', declaredMimeType: 'image/png', content: Buffer.from('<script>alert(1)</script>') },
        MAX,
      ),
    ).toEqual({ ok: false, reason: 'CONTENT_MISMATCH' });
    expect(validateUpload({ fileName: 'fake.pdf', declaredMimeType: 'application/pdf', content: PNG }, MAX)).toEqual({
      ok: false,
      reason: 'CONTENT_MISMATCH',
    });
    expect(
      validateUpload(
        { fileName: 'fake.webp', declaredMimeType: 'image/webp', content: Buffer.from('RIFF....WAVE') },
        MAX,
      ),
    ).toEqual({ ok: false, reason: 'CONTENT_MISMATCH' });
  });

  it('rejects "text" files with binary content', () => {
    expect(
      validateUpload(
        { fileName: 'a.txt', declaredMimeType: 'text/plain', content: Buffer.from([0x68, 0x00, 0x69]) },
        MAX,
      ),
    ).toEqual({ ok: false, reason: 'CONTENT_MISMATCH' });
  });
});

describe('sincronia com o @clickunicap/shared (validação da tela)', () => {
  it('as extensões e o limite padrão são os mesmos que a tela usa', () => {
    expect([...allowedExtensions()].sort()).toEqual([...ATTACHMENT_EXTENSIONS].sort());
    expect(DEFAULT_MAX_ATTACHMENT_BYTES).toBe(ATTACHMENT_MAX_BYTES);
  });
});
