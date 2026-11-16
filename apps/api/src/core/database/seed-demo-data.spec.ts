import { buildDemoTasks, DEMO_PEOPLE, DEMO_WORKSPACES, type DemoTaskSpec } from './seed-demo-data';

const TODAY = '2026-11-09';
const projects = DEMO_WORKSPACES.flatMap((workspace) => workspace.projects);
const allTasks = projects.flatMap((project) => buildDemoTasks(project.tasks, TODAY));

describe('buildDemoTasks', () => {
  const specs: DemoTaskSpec[] = [
    ['A', 'done', 'low', null, -5, -2],
    ['B', 'todo', 'low', null, null, 3, 'Com descrição'],
    ['C', 'todo', 'low', null, null, null],
  ];

  it('calcula as datas a partir de hoje, inclusive na virada do mês', () => {
    const [done, todo] = buildDemoTasks(specs, '2026-11-30');

    expect(done?.dueDate).toBe('2026-11-28');
    expect(todo?.dueDate).toBe('2026-12-03');
  });

  it('numera a posição dentro de cada coluna', () => {
    expect(buildDemoTasks(specs, TODAY).map((task) => task.position)).toEqual([1, 1, 2]);
  });

  it('marca a conclusão só nas tarefas concluídas', () => {
    const [done, todo] = buildDemoTasks(specs, TODAY);

    expect(done?.completedAt).toBeInstanceOf(Date);
    expect(todo?.completedAt).toBeNull();
  });
});

describe('dados de demonstração', () => {
  it('não repete e-mails', () => {
    const emails = Object.values(DEMO_PEOPLE).map((person) => person.email);

    expect(new Set(emails).size).toBe(emails.length);
  });

  it('coloca o dono como administrador do próprio workspace', () => {
    for (const workspace of DEMO_WORKSPACES) {
      expect(workspace.members[workspace.owner]).toBe('admin');
    }
  });

  it('só atribui tarefa a quem é membro do workspace', () => {
    for (const workspace of DEMO_WORKSPACES) {
      for (const project of workspace.projects) {
        for (const [title, , , assignee] of project.tasks) {
          if (assignee) expect([title, workspace.members[assignee]]).not.toEqual([title, undefined]);
        }
      }
    }
  });

  it('respeita a regra de início antes do prazo', () => {
    for (const task of allTasks) {
      if (task.startDate && task.dueDate) expect(task.startDate <= task.dueDate).toBe(true);
    }
  });

  it('usa cores no formato aceito pela API', () => {
    for (const project of projects) expect(project.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('cobre os estados que as telas mostram', () => {
    expect(allTasks.some((task) => task.status !== 'done' && !!task.dueDate && task.dueDate < TODAY)).toBe(true);
    expect(allTasks.some((task) => task.dueDate === null)).toBe(true);
    expect(allTasks.some((task) => task.assignee === null)).toBe(true);
    expect(new Set(allTasks.map((task) => task.status)).size).toBe(3);
    expect(new Set(allTasks.map((task) => task.priority)).size).toBe(4);
    expect(projects.some((project) => project.archived)).toBe(true);
  });
});
