import { safeNext, withNext } from './routes';

describe('safeNext', () => {
  it('aceita caminhos internos', () => {
    expect(safeNext('/invites/accept?token=abc')).toBe('/invites/accept?token=abc');
  });

  it('recusa endereços de outros sites', () => {
    expect(safeNext('https://malicioso.com')).toBeNull();
    expect(safeNext('//malicioso.com')).toBeNull();
    expect(safeNext('/\\malicioso.com')).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe('withNext', () => {
  it('codifica o destino na query string', () => {
    expect(withNext('/login', '/w/1?a=b')).toBe('/login?next=%2Fw%2F1%3Fa%3Db');
  });

  it('não acrescenta nada sem destino', () => {
    expect(withNext('/login', null)).toBe('/login');
  });
});
