import type { MemberRole, TaskPriority, TaskStatus } from '@clickunicap/shared';

/** Pessoas fictícias. Ana, Bruno e Carla são as mesmas do seed principal. */
export const DEMO_PEOPLE = {
  ana: { name: 'Ana', email: 'ana@clickunicap.dev' },
  bruno: { name: 'Bruno', email: 'bruno@clickunicap.dev' },
  carla: { name: 'Carla', email: 'carla@clickunicap.dev' },
  diego: { name: 'Diego Almeida', email: 'diego.almeida@clickunicap.dev' },
  eduarda: { name: 'Eduarda Nunes', email: 'eduarda.nunes@clickunicap.dev' },
  felipe: { name: 'Felipe Rocha', email: 'felipe.rocha@clickunicap.dev' },
  gabriela: { name: 'Gabriela Martins', email: 'gabriela.martins@clickunicap.dev' },
  henrique: { name: 'Henrique Costa', email: 'henrique.costa@clickunicap.dev' },
  isabela: { name: 'Isabela Freitas', email: 'isabela.freitas@clickunicap.dev' },
  lucas: { name: 'Lucas Ferreira', email: 'lucas.ferreira@clickunicap.dev' },
  mariana: { name: 'Mariana Castro', email: 'mariana.castro@clickunicap.dev' },
};

export type DemoPerson = keyof typeof DEMO_PEOPLE;

/** Título, status, prioridade, responsável, início e prazo (em dias a partir de hoje). */
export type DemoTaskSpec = [
  title: string,
  status: TaskStatus,
  priority: TaskPriority,
  assignee: DemoPerson | null,
  startOffset: number | null,
  dueOffset: number | null,
  description?: string,
];

export interface DemoProject {
  name: string;
  description: string;
  color: string;
  archived?: boolean;
  tasks: DemoTaskSpec[];
}

export interface DemoWorkspace {
  name: string;
  owner: DemoPerson;
  members: Partial<Record<DemoPerson, MemberRole>>;
  invites: { email: string; role: MemberRole }[];
  projects: DemoProject[];
}

export const DEMO_WORKSPACES: DemoWorkspace[] = [
  {
    name: 'Agência Aurora',
    owner: 'ana',
    members: {
      ana: 'admin',
      bruno: 'admin',
      carla: 'member',
      diego: 'member',
      eduarda: 'member',
      felipe: 'member',
      gabriela: 'member',
    },
    invites: [
      { email: 'estagio.design@exemplo.com', role: 'member' },
      { email: 'coordenacao@exemplo.com', role: 'admin' },
    ],
    projects: [
      {
        name: 'Site da Padaria Trigo Bom',
        description: 'Novo site institucional com cardápio online e pedidos pelo WhatsApp.',
        color: '#67bfff',
        tasks: [
          ['Levantar requisitos com a cliente', 'done', 'high', 'ana', -21, -16, 'Reunião presencial na padaria.'],
          ['Definir o mapa do site', 'done', 'medium', 'carla', -16, -12],
          ['Escolher paleta e tipografia', 'done', 'medium', 'gabriela', -14, -9],
          ['Criar o layout da página inicial', 'in_progress', 'high', 'gabriela', -6, 2],
          ['Fotografar os produtos', 'in_progress', 'medium', 'felipe', -4, -1, 'Falta a linha de bolos.'],
          ['Implementar o cardápio online', 'in_progress', 'urgent', 'diego', -3, 4],
          ['Integrar pedidos pelo WhatsApp', 'todo', 'high', 'diego', 2, 9],
          ['Escrever os textos da página Sobre', 'todo', 'low', 'eduarda', null, 6],
          ['Configurar domínio e hospedagem', 'todo', 'urgent', 'bruno', null, 3],
          ['Ajustar o SEO local', 'todo', 'medium', null, null, 18],
          ['Revisar a acessibilidade', 'todo', 'medium', 'carla', null, null],
        ],
      },
      {
        name: 'Campanha de Natal',
        description: 'Peças para redes sociais e anúncios de dezembro.',
        color: '#ff5656',
        tasks: [
          ['Definir o conceito da campanha', 'done', 'urgent', 'ana', -18, -11],
          ['Aprovar o orçamento de mídia', 'done', 'high', 'bruno', -12, -8],
          ['Produzir o vídeo de 30 segundos', 'in_progress', 'urgent', 'felipe', -5, 5],
          ['Criar os carrosséis do Instagram', 'in_progress', 'high', 'gabriela', -2, 3],
          ['Redigir as legendas', 'in_progress', 'medium', 'eduarda', -4, -2],
          ['Montar o calendário de postagens', 'todo', 'high', 'eduarda', null, 2],
          ['Configurar os anúncios pagos', 'todo', 'urgent', 'bruno', 4, 12],
          ['Criar o e-mail marketing', 'todo', 'medium', null, null, 10],
          ['Preparar o relatório de resultados', 'todo', 'low', 'carla', null, 40],
        ],
      },
      {
        name: 'Aplicativo de Entregas',
        description: 'MVP do aplicativo para o restaurante Sabor da Terra.',
        color: '#8470ff',
        tasks: [
          ['Mapear o fluxo do pedido', 'done', 'high', 'carla', -25, -20],
          ['Prototipar as telas principais', 'done', 'high', 'gabriela', -20, -13],
          ['Modelar o banco de dados', 'done', 'medium', 'diego', -15, -10],
          ['Criar a API de pedidos', 'in_progress', 'urgent', 'diego', -7, 1],
          ['Implementar o login por telefone', 'in_progress', 'high', 'bruno', -4, -3],
          ['Criar a tela de acompanhamento', 'todo', 'high', 'diego', 1, 7],
          ['Integrar o pagamento com Pix', 'todo', 'urgent', 'bruno', 5, 15],
          ['Escrever os termos de uso', 'todo', 'low', 'eduarda', null, 25],
          ['Testar com clientes reais', 'todo', 'medium', 'carla', null, 30],
          ['Publicar nas lojas de aplicativos', 'todo', 'medium', null, null, null],
        ],
      },
      {
        name: 'Rebranding Aurora 2025',
        description: 'Projeto encerrado: nova identidade visual da agência.',
        color: '#9ca3af',
        archived: true,
        tasks: [
          ['Criar o novo logotipo', 'done', 'high', 'gabriela', -120, -95],
          ['Atualizar os modelos de apresentação', 'done', 'low', 'eduarda', -95, -80],
          ['Trocar as artes das redes sociais', 'done', 'medium', 'felipe', -90, -75],
        ],
      },
    ],
  },
  {
    name: 'TCC de Sistemas de Informação',
    owner: 'carla',
    members: { carla: 'admin', ana: 'member', henrique: 'member', isabela: 'member' },
    invites: [{ email: 'orientador.tcc@exemplo.com', role: 'member' }],
    projects: [
      {
        name: 'Monografia',
        description: 'Escrita, revisão e entrega do texto final.',
        color: '#f0bb33',
        tasks: [
          ['Escolher o tema com o orientador', 'done', 'urgent', 'carla', -60, -50],
          ['Escrever a introdução', 'done', 'high', 'ana', -40, -28],
          ['Fazer a revisão bibliográfica', 'in_progress', 'high', 'isabela', -20, 6],
          ['Escrever a metodologia', 'in_progress', 'medium', 'henrique', -8, -4],
          ['Descrever os resultados', 'todo', 'high', 'ana', 3, 20],
          ['Formatar nas normas da ABNT', 'todo', 'medium', 'isabela', null, 32],
          ['Preparar os slides da defesa', 'todo', 'urgent', 'carla', null, 45],
          ['Pedir a declaração do revisor', 'todo', 'low', null, null, null],
        ],
      },
      {
        name: 'Protótipo do sistema',
        description: 'Sistema de agendamento usado como estudo de caso.',
        color: '#3ec972',
        tasks: [
          ['Definir os requisitos', 'done', 'high', 'henrique', -35, -27],
          ['Configurar o repositório', 'done', 'low', 'ana', -30, -29],
          ['Criar o cadastro de horários', 'in_progress', 'high', 'henrique', -9, 2],
          ['Implementar as notificações', 'in_progress', 'medium', 'ana', -3, 5],
          ['Aplicar o questionário de usabilidade', 'todo', 'urgent', 'isabela', 7, 14],
          ['Coletar as métricas de uso', 'todo', 'medium', null, null, 21],
        ],
      },
    ],
  },
  {
    name: 'Atlética da Computação',
    owner: 'bruno',
    members: { bruno: 'admin', ana: 'member', lucas: 'admin', mariana: 'member', diego: 'member' },
    invites: [],
    projects: [
      {
        name: 'Semana de Integração',
        description: 'Recepção dos calouros do próximo semestre.',
        color: '#755ff8',
        tasks: [
          ['Reservar o auditório', 'done', 'urgent', 'lucas', -15, -10],
          ['Fechar a parceria com a lanchonete', 'done', 'medium', 'mariana', -12, -6],
          ['Montar a programação', 'in_progress', 'high', 'mariana', -5, 1],
          ['Criar a arte de divulgação', 'in_progress', 'medium', 'diego', -2, 0],
          ['Abrir as inscrições', 'todo', 'urgent', 'lucas', 1, 4],
          ['Comprar os brindes', 'todo', 'low', 'ana', null, 11],
          ['Organizar os voluntários', 'todo', 'high', 'bruno', null, 8],
          ['Enviar o agradecimento aos parceiros', 'todo', 'low', null, null, null],
        ],
      },
      {
        name: 'Campeonato interno',
        description: 'Torneio de futsal e e-sports entre as turmas.',
        color: '#56b1f3',
        tasks: [
          ['Definir as modalidades', 'done', 'medium', 'bruno', -10, -7],
          ['Abrir a inscrição das turmas', 'in_progress', 'high', 'lucas', -3, -1],
          ['Montar a tabela de jogos', 'todo', 'high', 'mariana', 2, 13],
          ['Reservar a quadra', 'todo', 'urgent', 'ana', null, 5],
          ['Encomendar as medalhas', 'todo', 'medium', null, null, 16],
        ],
      },
    ],
  },
];

export interface DemoTask {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: DemoPerson | null;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  completedAt: Date | null;
}

function addDays(dayIso: string, days: number): string {
  const date = new Date(`${dayIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Converte as distâncias em datas reais, com a posição contada por coluna. Função pura para poder testar. */
export function buildDemoTasks(specs: DemoTaskSpec[], todayIso: string): DemoTask[] {
  const nextPosition: Partial<Record<TaskStatus, number>> = {};
  return specs.map(([title, status, priority, assignee, startOffset, dueOffset, description]) => {
    const position = (nextPosition[status] ?? 0) + 1;
    nextPosition[status] = position;
    const dueDate = dueOffset === null ? null : addDays(todayIso, dueOffset);
    return {
      title,
      description: description ?? null,
      status,
      priority,
      assignee,
      startDate: startOffset === null ? null : addDays(todayIso, startOffset),
      dueDate,
      position,
      completedAt: status === 'done' && dueDate ? new Date(`${dueDate}T18:00:00.000Z`) : null,
    };
  });
}
