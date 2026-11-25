import { notifications } from '../mocks/notifications.handlers';
import { bellLabel, describeNotification, timeAgo } from './describe';

const [assigned, dueSoon] = notifications as [(typeof notifications)[0], (typeof notifications)[0]];

describe('describeNotification', () => {
  it('atribuição: quem atribuiu e a tarefa', () => {
    expect(describeNotification(assigned)).toBe('Bruno Lima atribuiu a você a tarefa "Setup do apps/web"');
  });

  it('menção: quem mencionou, ou "Alguém" sem autor', () => {
    const mention = { ...assigned, type: 'comment_mentioned' as const };
    expect(describeNotification(mention)).toBe('Bruno Lima mencionou você em "Setup do apps/web"');
    const noActor = { ...mention, payload: { ...mention.payload, actorName: null } };
    expect(describeNotification(noActor)).toBe('Alguém mencionou você em "Setup do apps/web"');
  });

  it('prazo chegando: aviso automático', () => {
    expect(describeNotification(dueSoon)).toBe('O prazo de "Setup do apps/web" está chegando');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-11-04T12:30:00.000Z');

  it('conta o tempo para trás, em português', () => {
    expect(timeAgo('2026-11-04T12:25:00.000Z', now)).toBe('há 5 minutos');
    expect(timeAgo('2026-11-02T12:30:00.000Z', now)).toBe('há 2 dias');
  });

  it('data no futuro (relógio adiantado) conta como agora', () => {
    expect(timeAgo('2026-11-04T12:30:05.000Z', now)).toBe('há 0 segundos');
  });
});

describe('bellLabel', () => {
  it('diz quantas não lidas há', () => {
    expect(bellLabel(0)).toBe('Notificações, nenhuma não lida');
    expect(bellLabel(1)).toBe('Notificações, 1 não lida');
    expect(bellLabel(7)).toBe('Notificações, 7 não lidas');
    expect(bellLabel(150)).toBe('Notificações, mais de 99 não lidas');
  });
});
