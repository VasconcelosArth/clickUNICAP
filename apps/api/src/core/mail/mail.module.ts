import { Global, Module } from '@nestjs/common';
import { AppConfig } from '@/core/config';
import { MailService } from './mail.service';
import { MAIL_TRANSPORT, type MailTransport } from './mail.types';
import { LogMailTransport } from './transports/log.transport';
import { ResendMailTransport } from './transports/resend.transport';

/** Escolhe o transporte de e-mail pelo .env (MAIL_TRANSPORT=log | resend). */
export function createMailTransport(config: AppConfig): MailTransport {
  const { transport, resendApiKey } = config.mail;
  if (transport === 'resend' && resendApiKey) return new ResendMailTransport(resendApiKey);
  return new LogMailTransport();
}

@Global()
@Module({
  providers: [{ provide: MAIL_TRANSPORT, inject: [AppConfig], useFactory: createMailTransport }, MailService],
  exports: [MailService],
})
export class MailModule {}
