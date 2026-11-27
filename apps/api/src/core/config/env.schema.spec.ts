import { parseEnv } from './env.schema';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(16),
  JWT_REFRESH_SECRET: 'b'.repeat(16),
};

describe('parseEnv', () => {
  it('aplica os valores padrão', () => {
    const env = parseEnv(valid);
    expect(env.API_PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_ACCESS_TTL).toBe('15m');
  });

  it('converte API_PORT de string para número', () => {
    expect(parseEnv({ ...valid, API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it('lista TODAS as variáveis com problema numa mensagem só', () => {
    expect(() => parseEnv({ JWT_ACCESS_SECRET: 'curto' })).toThrow(
      /DATABASE_URL[\s\S]*JWT_ACCESS_SECRET[\s\S]*JWT_REFRESH_SECRET/,
    );
  });

  it('usa o transporte de e-mail "log" por padrão (não precisa de chave)', () => {
    expect(parseEnv(valid).MAIL_TRANSPORT).toBe('log');
  });

  it('exige RESEND_API_KEY quando MAIL_TRANSPORT=resend', () => {
    expect(() => parseEnv({ ...valid, MAIL_TRANSPORT: 'resend' })).toThrow(/RESEND_API_KEY/);
    expect(() => parseEnv({ ...valid, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 'chave-errada' })).toThrow(
      /RESEND_API_KEY/,
    );
    expect(parseEnv({ ...valid, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_123abc' }).RESEND_API_KEY).toBe(
      're_123abc',
    );
  });

  it('trata variável vazia no .env como ausente', () => {
    expect(parseEnv({ ...valid, RESEND_API_KEY: '' }).RESEND_API_KEY).toBeUndefined();
  });

  it('rejeita segredo JWT curto', () => {
    expect(() => parseEnv({ ...valid, JWT_REFRESH_SECRET: '123' })).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('usa a pasta ./uploads e o limite de 10 MB para anexos por padrão', () => {
    const env = parseEnv(valid);
    expect(env.STORAGE_DRIVER).toBe('local');
    expect(env.STORAGE_LOCAL_PATH).toBe('./uploads');
    expect(env.MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
  });

  it('rejeita STORAGE_DRIVER desconhecido', () => {
    expect(() => parseEnv({ ...valid, STORAGE_DRIVER: 's3' })).toThrow(/STORAGE_DRIVER/);
  });

  it('converte MAX_UPLOAD_BYTES de string para número', () => {
    expect(parseEnv({ ...valid, MAX_UPLOAD_BYTES: '2048' }).MAX_UPLOAD_BYTES).toBe(2048);
  });

  it('rejeita MAX_UPLOAD_BYTES inválido ou acima do teto de 50 MB', () => {
    expect(() => parseEnv({ ...valid, MAX_UPLOAD_BYTES: '0' })).toThrow(/MAX_UPLOAD_BYTES/);
    expect(() => parseEnv({ ...valid, MAX_UPLOAD_BYTES: 'abc' })).toThrow(/MAX_UPLOAD_BYTES/);
    expect(() => parseEnv({ ...valid, MAX_UPLOAD_BYTES: String(51 * 1024 * 1024) })).toThrow(/MAX_UPLOAD_BYTES/);
  });
});
