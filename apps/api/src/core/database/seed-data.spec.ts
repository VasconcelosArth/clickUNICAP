import { buildSeedTasks, SEED_USERS } from './seed-data';

describe('buildSeedTasks', () => {
  const tasks = buildSeedTasks('App', 15);

  it('gera a quantidade pedida, com status variados', () => {
    expect(tasks).toHaveLength(15);
    expect(new Set(tasks.map((t) => t.status)).size).toBe(3);
  });

  it('numera a posição dentro de cada coluna', () => {
    expect(tasks.filter((t) => t.status === 'todo').map((t) => t.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it('usa só responsáveis existentes ou nenhum', () => {
    for (const t of tasks) {
      expect(t.assigneeIndex === null || t.assigneeIndex < SEED_USERS.length).toBe(true);
    }
    expect(tasks.some((t) => t.assigneeIndex === null)).toBe(true);
  });
});
