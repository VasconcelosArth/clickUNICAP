const MENTION = /@\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi;

export type BodySegment = { type: 'text'; text: string } | { type: 'mention'; userId: string };

/** Quebra o texto do comentário em trechos comuns e menções no formato `@[userId]`. */
export function splitMentions(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION)) {
    const userId = match[1];
    if (!userId) continue;
    if (match.index > last) segments.push({ type: 'text', text: body.slice(last, match.index) });
    segments.push({ type: 'mention', userId });
    last = match.index + match[0].length;
  }
  if (last < body.length) segments.push({ type: 'text', text: body.slice(last) });
  return segments;
}

/** O mínimo de um membro que as menções precisam. */
export interface MentionMember {
  userId: string;
  name: string;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Para comparar sem diferenciar maiúsculas nem acentos. */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Formato gravado → texto editável: `@[userId]` vira `@Nome`. A menção de quem não está mais na lista
 * fica como está, para não se perder ao salvar.
 */
export function mentionsToDisplay(body: string, members: MentionMember[]): string {
  const names = new Map(members.map((member) => [member.userId.toLowerCase(), member.name]));
  return body.replace(MENTION, (token, userId: string) => {
    const name = names.get(userId.toLowerCase());
    return name ? `@${name}` : token;
  });
}

/**
 * Texto editável → formato gravado: `@Nome` de um membro vira `@[userId]`. Nomes mais longos são testados primeiro
 * (`@Ana Souza` antes de `@Ana`) e o nome precisa terminar ali (`@Anabela` não é `@Ana`).
 */
export function mentionsToStored(text: string, members: MentionMember[]): string {
  const named = members.filter((member) => member.name.trim());
  if (named.length === 0) return text;
  const ids = new Map<string, string>();
  for (const member of named) if (!ids.has(member.name)) ids.set(member.name, member.userId);
  const alternatives = [...ids.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const pattern = new RegExp(`@(${alternatives.join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
  return text.replace(pattern, (token, name: string) => {
    const userId = ids.get(name);
    return userId ? `@[${userId}]` : token;
  });
}

/** A menção sendo digitada antes do cursor: `start` é a posição do `@` e `query` o que veio depois dele. */
export interface MentionQuery {
  start: number;
  query: string;
}

export function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const match = /(^|\s)@((?:[^\s@][^@\n]{0,39})?)$/u.exec(text.slice(0, caret));
  if (!match) return null;
  return { start: match.index + (match[1]?.length ?? 0), query: match[2] ?? '' };
}

/** Membros cujo nome contém o que foi digitado depois do `@` (sem diferenciar maiúsculas nem acentos). */
export function filterMembers<T extends MentionMember>(members: T[], query: string): T[] {
  const wanted = normalize(query);
  return members.filter((member) => normalize(member.name).includes(wanted));
}

/** Troca a menção sendo digitada por `@Nome ` e devolve o texto novo e onde o cursor deve ficar. */
export function insertMention(
  text: string,
  mention: MentionQuery,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const after = text.slice(caret);
  const inserted = `@${name}${/^\s/.test(after) ? '' : ' '}`;
  const next = text.slice(0, mention.start) + inserted + after;
  const position = mention.start + inserted.length + (/^\s/.test(after) ? 1 : 0);
  return { text: next, caret: position };
}
