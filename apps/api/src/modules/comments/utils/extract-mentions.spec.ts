import { extractMentionedUserIds } from './extract-mentions';
import { randomUUID } from 'node:crypto';

const U1 = randomUUID();
const U2 = randomUUID();

describe('extractMentionedUserIds', () => {
  it('devolve lista vazia sem menções', () => {
    expect(extractMentionedUserIds('oi pessoal')).toEqual([]);
  });
  it('extrai menções no formato @[userId]', () => {
    expect(extractMentionedUserIds(`oi @[${U1}] e @[${U2}]`)).toEqual([U1, U2]);
  });

  it('remove menções repetidas', () => {
    expect(extractMentionedUserIds(`@[${U1}] @[${U1}]`)).toEqual([U1]);
  });

  it('ignora ids inválidos', () => {
    expect(extractMentionedUserIds('@[abc]')).toEqual([]);
  });
});
