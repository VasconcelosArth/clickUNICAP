import { fixLatin1FileName, getExtension, sanitizeFileName } from './sanitize-file-name';

describe('sanitizeFileName', () => {
  it('keeps a normal name, including accents', () => {
    expect(sanitizeFileName('relatório final.pdf')).toBe('relatório final.pdf');
  });

  it('removes directories from path traversal attempts', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('..\\..\\windows\\system32\\evil.txt')).toBe('evil.txt');
    expect(sanitizeFileName('/absolute/path/file.png')).toBe('file.png');
  });

  it('never returns separators or ".."', () => {
    const result = sanitizeFileName('....//..\\x/../..');
    expect(result).not.toContain('/');
    expect(result).not.toContain('\\');
    expect(result).not.toContain('..');
  });

  it('removes control characters and null bytes', () => {
    expect(sanitizeFileName('a\u0000b\u001f.txt')).toBe('ab.txt');
  });

  it('replaces reserved and bidi-override characters', () => {
    expect(sanitizeFileName('a<b>:c|d?.txt')).toBe('a_b__c_d_.txt');
    expect(sanitizeFileName('doc\u202egpj.exe')).toBe('doc_gpj.exe');
  });

  it('removes leading dots and trailing dots or spaces', () => {
    expect(sanitizeFileName('.htaccess')).toBe('htaccess');
    expect(sanitizeFileName('file.txt. . ')).toBe('file.txt');
  });

  it('falls back to a default name when nothing is left', () => {
    expect(sanitizeFileName('')).toBe('file');
    expect(sanitizeFileName('...')).toBe('file');
    expect(sanitizeFileName('../')).toBe('file');
  });

  it('limits the length and preserves the extension', () => {
    const result = sanitizeFileName(`${'a'.repeat(500)}.pdf`);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith('.pdf')).toBe(true);
  });
});

describe('getExtension', () => {
  it('returns the lowercase extension', () => {
    expect(getExtension('Photo.JPG')).toBe('jpg');
    expect(getExtension('archive.tar.gz')).toBe('gz');
  });

  it('returns an empty string when there is none', () => {
    expect(getExtension('README')).toBe('');
    expect(getExtension('file.')).toBe('');
    expect(getExtension('.hidden')).toBe('');
  });
});

describe('fixLatin1FileName', () => {
  it('repairs UTF-8 names that were read as latin1', () => {
    const garbled = Buffer.from('relatório.pdf', 'utf8').toString('latin1');
    expect(fixLatin1FileName(garbled)).toBe('relatório.pdf');
  });

  it('leaves plain ASCII names alone', () => {
    expect(fixLatin1FileName('report.pdf')).toBe('report.pdf');
  });

  it('leaves names that already contain real Unicode alone', () => {
    expect(fixLatin1FileName('日本語.pdf')).toBe('日本語.pdf');
  });
});
