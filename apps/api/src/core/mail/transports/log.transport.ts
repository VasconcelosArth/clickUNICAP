import { Logger } from '@nestjs/common';
import type { MailMessage, MailTransport } from '../mail.types';

/** Desenvolvimento: não envia nada, só escreve o e-mail no log da API. */
export class LogMailTransport implements MailTransport {
  readonly name = 'log';
  private readonly logger = new Logger('Mail');

  async send(message: MailMessage & { from: string }): Promise<void> {
    this.logger.log(`[não enviado — MAIL_TRANSPORT=log] Para: ${message.to} | ${message.subject}\n${message.text}`);
  }
}
