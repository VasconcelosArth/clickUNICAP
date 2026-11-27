const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const MENTION_REGEX = new RegExp(`@\\[(${UUID})\\]`, 'g');

export function extractMentionedUserIds(body: string): string[] {
  const ids = Array.from(body.matchAll(MENTION_REGEX), (m) => m[1]);
  return [...new Set(ids.filter((id): id is string => id !== undefined))];
}
