import type { MailMessage } from '../mail.types';

/** Escapa texto que vem do usuário antes de colocar no HTML (evita injeção de HTML no e-mail). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** E-mail de recuperação de senha (texto + HTML simples, compatível com a maioria dos clientes). */
export function passwordResetEmail(params: { to: string; name: string; link: string; validMinutes: number }): MailMessage {
  const { to, name, link, validMinutes } = params;
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(link);

  const text = [
    `Olá, ${name}.`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta no ClickUNICAP.',
    `Para criar uma nova senha, acesse: ${link}`,
    '',
    `O link vale por ${validMinutes} minutos e só pode ser usado uma vez.`,
    'Se não foi você, ignore este e-mail: sua senha continua a mesma.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f2f5fa;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px">
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#1f3a68">Redefinir sua senha</h1>
        <p style="margin:0 0 16px;line-height:1.5">Olá, ${safeName}.</p>
        <p style="margin:0 0 24px;line-height:1.5">Recebemos um pedido para redefinir a senha da sua conta no ClickUNICAP.</p>
        <p style="margin:0 0 24px">
          <a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#1f3a68;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">Criar nova senha</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#4b5563">O link vale por ${validMinutes} minutos e só pode ser usado uma vez.</p>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#4b5563">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
        <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all">Se o botão não funcionar, copie este endereço: ${safeLink}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { to, subject: 'Redefina sua senha — ClickUNICAP', text, html };
}
