import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '@/core/config';
import { MAIL_TRANSPORT, type MailMessage, type MailTransport } from './mail.types';

export type { MailMessage } from './mail.types';

/**
 * Ponto único de envio de e-mail. O transporte (log ou Resend) é escolhido por MAIL_TRANSPORT no .env.
 * Services chamam `mail.send(...)` e não sabem qual provedor está por trás.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  /** Últimos e-mails enviados (máx. 50) — usado nos testes e2e para pegar links. */
  readonly outbox: MailMessage[] = [];

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    private readonly config: AppConfig,
  ) {}

  async send(message: MailMessage): Promise<void> {
    this.outbox.push(message);
    if (this.outbox.length > 50) this.outbox.shift();
    await this.transport.send({ ...message, from: this.config.mail.from });
    this.logger.log(`E-mail "${message.subject}" entregue ao transporte ${this.transport.name}`);
  }
}
