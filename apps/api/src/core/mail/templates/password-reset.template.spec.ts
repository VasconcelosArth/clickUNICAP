import { escapeHtml, passwordResetEmail } from './password-reset.template';

describe('passwordResetEmail', () => {
  const link = 'http://localhost:5173/reset-password?token=abc_123';

  it('tem o link no texto e no botão do HTML', () => {
    const mail = passwordResetEmail({ to: 'ana@teste.com', name: 'Ana', link, validMinutes: 60 });
    expect(mail.to).toBe('ana@teste.com');
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(`href="${link}"`);
    expect(mail.text).toContain('60 minutos');
  });

  it('escapa o nome no HTML (nome malicioso não vira HTML)', () => {
    const mail = passwordResetEmail({ to: 'a@b.com', name: '<script>alert(1)</script>', link, validMinutes: 60 });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});

describe('escapeHtml', () => {
  it('escapa os 5 caracteres especiais', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
