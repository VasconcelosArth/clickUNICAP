import type { MailMessage } from '../mail.types';
import { escapeHtml } from './password-reset.template';

/** E-mail de convite para um workspace. */
export function workspaceInviteEmail(params: {
  to: string;
  inviterName: string;
  workspaceName: string;
  link: string;
  validDays: number;
}): MailMessage {
  const { to, inviterName, workspaceName, link, validDays } = params;
  const [inviter, workspace, safeLink] = [inviterName, workspaceName, link].map(escapeHtml);

  const text = [
    `${inviterName} convidou você para o workspace "${workspaceName}" no ClickUNICAP.`,
    '',
    `Para aceitar, acesse: ${link}`,
    'Se ainda não tem conta, crie uma com este mesmo e-mail e depois abra o link.',
    '',
    `O convite vale por ${validDays} dias.`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f2f5fa;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px">
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#1f3a68">Você foi convidado(a)</h1>
        <p style="margin:0 0 24px;line-height:1.5"><strong>${inviter}</strong> convidou você para o workspace <strong>${workspace}</strong> no ClickUNICAP.</p>
        <p style="margin:0 0 24px">
          <a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#1f3a68;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">Aceitar convite</a>
        </p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#4b5563">Ainda não tem conta? Crie uma com este mesmo e-mail e depois abra o link.</p>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#4b5563">O convite vale por ${validDays} dias.</p>
        <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all">Se o botão não funcionar, copie este endereço: ${safeLink}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { to, subject: `${inviterName} convidou você para "${workspaceName}" — ClickUNICAP`, text, html };
}
