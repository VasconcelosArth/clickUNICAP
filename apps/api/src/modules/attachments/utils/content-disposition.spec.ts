import { attachmentDisposition } from './content-disposition';

describe('attachmentDisposition', () => {
  it('always forces a download', () => {
    expect(attachmentDisposition('a.pdf').startsWith('attachment;')).toBe(true);
  });

  it('keeps a simple name as is', () => {
    expect(attachmentDisposition('report.pdf')).toBe(
      `attachment; filename="report.pdf"; filename*=UTF-8''report.pdf`,
    );
  });

  it('gives an ASCII fallback and a UTF-8 version for accents', () => {
    expect(attachmentDisposition('relatório final.pdf')).toBe(
      `attachment; filename="relatorio final.pdf"; filename*=UTF-8''relat%C3%B3rio%20final.pdf`,
    );
  });

  it('cannot break out of the header with quotes or line breaks', () => {
    const header = attachmentDisposition('a"; x=y\r\nSet-Cookie: z.pdf');
    expect(header).not.toContain('\r');
    expect(header).not.toContain('\n');
    expect(header.split('"').length).toBe(3); // only the two quotes around the fallback
  });

  it('encodes characters that RFC 5987 leaves unescaped', () => {
    expect(attachmentDisposition("it's (1)*.txt")).toContain("filename*=UTF-8''it%27s%20%281%29%2A.txt");
  });
});
