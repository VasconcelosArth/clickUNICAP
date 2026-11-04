import type { MailMessage, MailTransport } from '../mail.types';

export const RESEND_API_URL = 'https://api.resend.com/emails';

/** Erro do Resend com o status HTTP e a mensagem devolvida pela API. */
export class ResendError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(`Resend respondeu ${status}: ${message}`);
    this.name = 'ResendError';
  }
}

/**
 * Envio real pelo Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Usa a API HTTP direto com fetch — sem SDK, uma dependência a menos.
 *
 * Em teste/dev sem domínio verificado, o Resend só entrega para o e-mail dono da conta
 * e exige o remetente "onboarding@resend.dev".
 */
export class ResendMailTransport implements MailTransport {
  readonly name = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: MailMessage & { from: string }): Promise<void> {
    const res = await this.fetchImpl(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html && { html: message.html }),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new ResendError(res.status, body.message ?? res.statusText);
    }
  }
}
