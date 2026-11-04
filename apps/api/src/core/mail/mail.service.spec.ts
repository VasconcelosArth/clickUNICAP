import { AppConfig } from '@/core/config';
import { createMailTransport } from './mail.module';
import { MailService } from './mail.service';
import { LogMailTransport } from './transports/log.transport';
import { ResendMailTransport } from './transports/resend.transport';

const config = (mail: Partial<AppConfig['mail']>) =>
  ({ mail: { transport: 'log', from: 'App <a@b.com>', resendApiKey: undefined, ...mail } }) as AppConfig;

describe('createMailTransport', () => {
  it('usa o log por padrão', () => {
    expect(createMailTransport(config({}))).toBeInstanceOf(LogMailTransport);
  });

  it('usa o Resend quando MAIL_TRANSPORT=resend e há chave', () => {
    expect(createMailTransport(config({ transport: 'resend', resendApiKey: 're_x' }))).toBeInstanceOf(
      ResendMailTransport,
    );
  });
});

describe('MailService', () => {
  it('preenche o remetente (MAIL_FROM) e repassa ao transporte', async () => {
    const transport = { name: 'fake', send: jest.fn() };
    const service = new MailService(transport, config({ from: 'ClickUNICAP <no-reply@x.dev>' }));

    await service.send({ to: 'ana@teste.com', subject: 'S', text: 'T' });

    expect(transport.send).toHaveBeenCalledWith({ to: 'ana@teste.com', subject: 'S', text: 'T', from: 'ClickUNICAP <no-reply@x.dev>' });
    expect(service.outbox).toHaveLength(1);
  });

  it('propaga o erro do transporte (quem chama decide o que fazer)', async () => {
    const transport = { name: 'fake', send: jest.fn().mockRejectedValue(new Error('fora do ar')) };
    await expect(new MailService(transport, config({})).send({ to: 'a@b.com', subject: 'S', text: 'T' })).rejects.toThrow(
      'fora do ar',
    );
  });
});
