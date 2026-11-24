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

/** Texto para inserir no campo quando o usuário escolhe alguém na lista. */
export function appendMention(body: string, userId: string): string {
  const separator = body && !/\s$/.test(body) ? ' ' : '';
  return `${body}${separator}@[${userId}] `;
}
