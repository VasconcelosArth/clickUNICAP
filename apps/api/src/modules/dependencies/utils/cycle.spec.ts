import { type DependencyEdge, wouldCreateCycle } from './cycle';

/** "a<-b" = a depende de b (b bloqueia a). */
const edges = (...pairs: string[]): DependencyEdge[] =>
  pairs.map((pair) => {
    const [taskId, dependsOnTaskId] = pair.split('<-') as [string, string];
    return { taskId, dependsOnTaskId };
  });

describe('wouldCreateCycle', () => {
  it('grafo vazio: nenhuma dependência nova fecha ciclo', () => {
    expect(wouldCreateCycle([], 'a', 'b')).toBe(false);
  });

  it('a tarefa depender de si mesma é ciclo', () => {
    expect(wouldCreateCycle([], 'a', 'a')).toBe(true);
  });

  it('inverter uma dependência direta é ciclo', () => {
    expect(wouldCreateCycle(edges('a<-b'), 'b', 'a')).toBe(true);
  });

  it('fechar uma cadeia longa é ciclo', () => {
    expect(wouldCreateCycle(edges('a<-b', 'b<-c', 'c<-d'), 'd', 'a')).toBe(true);
  });

  it('estender a cadeia no sentido certo não é ciclo', () => {
    expect(wouldCreateCycle(edges('a<-b', 'b<-c'), 'c', 'd')).toBe(false);
    expect(wouldCreateCycle(edges('a<-b', 'b<-c'), 'a', 'c')).toBe(false);
  });

  it('losango (duas tarefas que esperam a mesma) não é ciclo', () => {
    expect(wouldCreateCycle(edges('b<-a', 'c<-a', 'd<-b'), 'd', 'c')).toBe(false);
  });

  it('acha o ciclo por um caminho que passa por um ramo', () => {
    expect(wouldCreateCycle(edges('a<-b', 'b<-x', 'b<-c', 'c<-d'), 'd', 'a')).toBe(true);
  });

  it('termina mesmo se o grafo já tiver um ciclo que não envolve as tarefas', () => {
    expect(wouldCreateCycle(edges('x<-y', 'y<-x', 'a<-x'), 'b', 'a')).toBe(false);
  });
});
