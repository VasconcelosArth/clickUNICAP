import type { Notification } from '@clickunicap/shared';
import { formatDistanceStrict, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

/** O texto da notificação. Sem autor (aviso automático, ou conta apagada), fala de "Alguém". */
export function describeNotification(notification: Notification): string {
  const { actorName, taskTitle } = notification.payload;
  const actor = actorName ?? 'Alguém';
  switch (notification.type) {
    case 'task_assigned':
      return `${actor} atribuiu a você a tarefa "${taskTitle}"`;
    case 'comment_mentioned':
      return `${actor} mencionou você em "${taskTitle}"`;
    case 'task_due_soon':
      return `O prazo de "${taskTitle}" está chegando`;
  }
}

/** Ex.: "há 5 minutos". Um relógio adiantado no servidor não vira "em 2 segundos": conta como agora. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const date = parseISO(iso);
  const past = date.getTime() > now.getTime() ? now : date;
  return formatDistanceStrict(past, now, { addSuffix: true, locale: ptBR, roundingMethod: 'floor' });
}

/** Texto do botão do sino, para leitores de tela. */
export function bellLabel(unread: number): string {
  if (unread === 0) return 'Notificações, nenhuma não lida';
  if (unread === 1) return 'Notificações, 1 não lida';
  return `Notificações, ${unread > 99 ? 'mais de 99' : unread} não lidas`;
}
