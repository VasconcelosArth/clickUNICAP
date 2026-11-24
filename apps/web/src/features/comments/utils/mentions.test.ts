import { appendMention, splitMentions } from './mentions';
import { randomUUID } from 'crypto';

const ID = randomUUID();
const OTHER = randomUUID();

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

describe('appendMention', () => {
  it('adiciona a menção com espaço antes e depois', () => {
    expect(appendMention('Oi', ID)).toBe(`Oi @[${ID}] `);
  });

  it('não duplica o espaço nem começa com espaço', () => {
    expect(appendMention('', ID)).toBe(`@[${ID}] `);
    expect(appendMention('Oi ', ID)).toBe(`Oi @[${ID}] `);
  });
});
