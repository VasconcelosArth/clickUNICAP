import { defaultRange, readRange, rangeError, toReportQuery } from './period';

describe('defaultRange', () => {
  it('cobre os últimos 30 dias, contando hoje', () => {
    expect(defaultRange('2026-11-27')).toEqual({ from: '2026-10-29', to: '2026-11-27' });
  });
});

describe('readRange', () => {
  it('usa as datas da URL', () => {
    expect(readRange('2026-11-01', '2026-11-15', '2026-11-27')).toEqual({ from: '2026-11-01', to: '2026-11-15' });
  });

  it('troca data ausente ou inválida pela do período padrão', () => {
    expect(readRange(null, null, '2026-11-27')).toEqual({ from: '2026-10-29', to: '2026-11-27' });
    expect(readRange('2026-02-30', 'ontem', '2026-11-27')).toEqual({ from: '2026-10-29', to: '2026-11-27' });
    expect(readRange('2026-11-01', '', '2026-11-27')).toEqual({ from: '2026-11-01', to: '2026-11-27' });
  });
});

describe('rangeError', () => {
  it('aceita um dia só e até 366 dias', () => {
    expect(rangeError({ from: '2026-11-27', to: '2026-11-27' })).toBeNull();
    expect(rangeError({ from: '2025-11-27', to: '2026-11-27' })).toBeNull();
  });

  it('recusa período invertido, longo demais ou sem data', () => {
    expect(rangeError({ from: '2026-11-27', to: '2026-11-26' })).toBe(
      'A data final precisa ser igual ou depois da inicial',
    );
    expect(rangeError({ from: '2025-11-26', to: '2026-11-27' })).toBe('O período pode ter no máximo 366 dias');
    expect(rangeError({ from: '', to: '2026-11-27' })).toBe('Informe as duas datas');
  });
});

describe('toReportQuery', () => {
  it('vai do início do primeiro dia ao início do dia seguinte ao último, no fuso local', () => {
    const query = toReportQuery({ from: '2026-11-01', to: '2026-11-30' });

    expect(query).toEqual({
      from: new Date(2026, 10, 1).toISOString(),
      to: new Date(2026, 11, 1).toISOString(),
    });
  });

  it('período inválido não vira consulta', () => {
    expect(toReportQuery({ from: '2026-11-30', to: '2026-11-01' })).toBeNull();
  });
});
