export interface MailMessage {
  to: string;
  subject: string;
  /** Versão em texto puro (obrigatória: alguns clientes de e-mail não mostram HTML). */
  text: string;
  html?: string;
}

/** Um jeito de entregar e-mails. Para adicionar outro provedor, implemente esta interface. */
export interface MailTransport {
  readonly name: string;
  send(message: MailMessage & { from: string }): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
