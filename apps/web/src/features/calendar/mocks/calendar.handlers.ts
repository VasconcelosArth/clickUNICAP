/**
 * Handlers MSW para a feature de Calendário.
 *
 * O calendário consome GET /projects/:projectId/tasks — a mesma rota do
 * Kanban e da Lista. Por isso não são necessários handlers exclusivos:
 * reutilizamos os `tasksHandlers` em `src/mocks/handlers.ts`.
 *
 * Este arquivo existe para manter a consistência estrutural da feature e
 * para facilitar a adição de handlers específicos no futuro (ex.: eventos
 * externos, disponibilidade de membros).
 */

export const calendarHandlers = [] as const;
