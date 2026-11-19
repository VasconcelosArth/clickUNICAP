export interface DependencyEdge {
  /** A tarefa bloqueada. */
  taskId: string;
  /** A tarefa que bloqueia. */
  dependsOnTaskId: string;
}

/**
 * Diz se criar "`taskId` depende de `dependsOnTaskId`" fecha um ciclo.
 *
 * Fecha quando `dependsOnTaskId` já depende de `taskId`, direta ou indiretamente:
 * A ← B ← C mais C ← A faria A esperar por ela mesma. Busca em largura a partir de `dependsOnTaskId`,
 * seguindo de quem cada tarefa depende, até achar `taskId` ou acabar o grafo.
 */
export function wouldCreateCycle(edges: DependencyEdge[], taskId: string, dependsOnTaskId: string): boolean {
  if (taskId === dependsOnTaskId) return true;

  const dependsOn = new Map<string, string[]>();
  for (const edge of edges) {
    const list = dependsOn.get(edge.taskId) ?? [];
    list.push(edge.dependsOnTaskId);
    dependsOn.set(edge.taskId, list);
  }

  const visited = new Set<string>([dependsOnTaskId]);
  const queue = [dependsOnTaskId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of dependsOn.get(current) ?? []) {
      if (next === taskId) return true;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}
