import { randomUUID } from 'crypto';
import {
  filterMembers,
  findMentionQuery,
  insertMention,
  mentionsToDisplay,
  mentionsToStored,
  splitMentions,
} from './mentions';

const ID = randomUUID();
const OTHER = randomUUID();

const members = [
  { userId: ID, name: 'Ana' },
  { userId: OTHER, name: 'Ana Souza' },
];

describe('splitMentions', () => {
  it('devolve só texto quando não há menção', () => {
    expect(splitMentions('olá, time')).toEqual([{ type: 'text', text: 'olá, time' }]);
  });

  it('separa texto e menções, na ordem', () => {
    expect(splitMentions(`oi @[${ID}], veja com @[${OTHER}]!`)).toEqual([
      { type: 'text', text: 'oi ' },
      { type: 'mention', userId: ID },
      { type: 'text', text: ', veja com ' },
      { type: 'mention', userId: OTHER },
      { type: 'text', text: '!' },
    ]);
  });

  it('ignora formatos que não são menção', () => {
    expect(splitMentions('@[abc] e @fulano')).toEqual([{ type: 'text', text: '@[abc] e @fulano' }]);
  });
});

describe('mentionsToDisplay / mentionsToStored', () => {
  it('troca o id pelo nome e volta para o id', () => {
    const stored = `oi @[${OTHER}] e @[${ID}]!`;
    const display = mentionsToDisplay(stored, members);
    expect(display).toBe('oi @Ana Souza e @Ana!');
    expect(mentionsToStored(display, members)).toBe(stored);
  });

  it('mantém o token de quem não está na lista', () => {
    const unknown = randomUUID();
    expect(mentionsToDisplay(`@[${unknown}]`, members)).toBe(`@[${unknown}]`);
    expect(mentionsToStored(`@[${unknown}]`, members)).toBe(`@[${unknown}]`);
  });

  it('só converte o nome inteiro', () => {
    expect(mentionsToStored('@Anabela e email@Ana.com', members)).toBe(`@Anabela e email@[${ID}].com`);
    expect(mentionsToStored('@Anabela', members)).toBe('@Anabela');
  });

  it('sem membros, devolve o texto como está', () => {
    expect(mentionsToStored('@Ana', [])).toBe('@Ana');
  });
});

describe('findMentionQuery', () => {
  it('acha o @ antes do cursor', () => {
    expect(findMentionQuery('oi @an', 6)).toEqual({ start: 3, query: 'an' });
    expect(findMentionQuery('@', 1)).toEqual({ start: 0, query: '' });
    expect(findMentionQuery('oi @Ana So', 10)).toEqual({ start: 3, query: 'Ana So' });
  });

  it('ignora @ no meio de palavra, @ seguido de espaço e texto sem @', () => {
    expect(findMentionQuery('email@x', 7)).toBeNull();
    expect(findMentionQuery('oi @ ', 5)).toBeNull();
    expect(findMentionQuery('oi', 2)).toBeNull();
  });
});

describe('filterMembers', () => {
  it('filtra sem diferenciar maiúsculas nem acentos', () => {
    const list = [
      { userId: ID, name: 'João Silva' },
      { userId: OTHER, name: 'Bruno Lima' },
    ];
    expect(filterMembers(list, 'joao').map((m) => m.name)).toEqual(['João Silva']);
    expect(filterMembers(list, 'L').map((m) => m.name)).toEqual(['João Silva', 'Bruno Lima']);
    expect(filterMembers(list, '')).toHaveLength(2);
  });
});

describe('insertMention', () => {
  it('troca o que foi digitado por @Nome e um espaço', () => {
    expect(insertMention('oi @an', { start: 3, query: 'an' }, 6, 'Ana Souza')).toEqual({
      text: 'oi @Ana Souza ',
      caret: 14,
    });
  });

  it('não duplica o espaço quando já há texto depois', () => {
    expect(insertMention('oi @an tudo bem', { start: 3, query: 'an' }, 6, 'Ana')).toEqual({
      text: 'oi @Ana tudo bem',
      caret: 8,
    });
  });
});
