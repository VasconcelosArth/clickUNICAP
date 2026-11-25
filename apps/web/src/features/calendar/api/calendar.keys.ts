/**
 * Query keys da feature de Calendário.
 *
 * Reutilizamos as chaves de tarefas do núcleo (taskKeys) porque o calendário
 * exibe as mesmas tarefas do projeto. Assim, criar/atualizar uma tarefa em
 * qualquer outra visão invalida o cache e o calendário reflete a mudança.
 *
 * Esta chave é usada apenas internamente na feature; fora dela, usa-se
 * taskKeys de @/features/tasks.
 */

// Nenhuma chave própria necessária: o calendário consome `taskKeys.list`.
// Arquivo mantido para consistência estrutural da feature e para eventual
// extensão (ex.: eventos externos que não sejam tarefas).
export {};
