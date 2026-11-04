# 01 — Referência: como o ClickUp funciona

Este documento explica o produto que usamos de referência, para que todo mundo (e toda IA) use o mesmo
vocabulário. **Não estamos clonando o ClickUp.** Estamos construindo um sistema próprio que segue os mesmos conceitos de
gestão de trabalho. Não copie marca, logo, textos nem layout pixel a pixel.

## O que é o ClickUp

O ClickUp é uma plataforma de **gestão de trabalho e projetos** na nuvem, lançada em 2017, cujo slogan é ser
"um app para substituir todos". Ela junta num lugar só o que costuma ficar espalhado em várias ferramentas:

| Necessidade | Ferramenta comum | No ClickUp |
|---|---|---|
| Tarefas e quadros | Trello, Asana, Jira | Tasks + Views |
| Documentos e wikis | Notion, Google Docs | Docs |
| Metas | Planilhas de OKR | Goals |
| Conversa do time | Slack | Chat |
| Quadros brancos | Miro | Whiteboards |
| Relatórios | Planilhas, BI | Dashboards |

Concorrentes diretos: Asana, Monday.com, Notion, Jira e Trello.

## A hierarquia (o conceito mais importante)

Tudo no ClickUp se organiza numa árvore. Entender essa árvore é entender o sistema.

```
Workspace          → a organização inteira (ex.: "UNICAP - Grupo 3")
 └─ Space          → uma área ou um time (ex.: "Desenvolvimento", "Marketing")
     └─ Folder     → agrupador opcional (ex.: "Projeto App Mobile")
         └─ List   → uma lista de tarefas (ex.: "Sprint 1", "Backlog")
             └─ Task       → a unidade de trabalho
                 └─ Subtask → um pedaço da tarefa
                     └─ Checklist → itens marcáveis dentro da tarefa
```

### Como mapeamos isso no ClickUNICAP (simplificação do MVP)

No MVP, achatamos a hierarquia para ficar mais simples de construir:

```
Workspace  →  Project  →  Task  →  Subtask
```

- **Workspace** = Workspace do ClickUp.
- **Project** = Space + Folder + List do ClickUp, tudo junto num nível só.
- **Task** e **Subtask** = iguais ao ClickUp.

Se um dia o projeto precisar de Spaces e Folders, o modelo foi pensado para receber um `parent_id` em `projects`
sem quebrar nada. Ver [06 — Banco de dados](06-banco-de-dados.md).

## A tarefa (Task): o coração do produto

Cada tarefa tem:

| Atributo | Descrição | No MVP? |
|---|---|---|
| Título e descrição | O que precisa ser feito (descrição em texto rico) | Sim |
| Responsável (assignee) | Quem faz. No ClickUp pode ser mais de uma pessoa | Sim, uma pessoa |
| Prazo (due date) | Até quando | Sim |
| Data de início | Quando começa (usada no Gantt) | Sim (campo existe) |
| Status | Em que etapa está. No ClickUp é personalizável por lista | Sim, fixo: `todo`, `in_progress`, `done` (rótulos "A fazer", "Em andamento", "Concluído") |
| Prioridade | Urgente, Alta, Normal, Baixa | Sim: `urgent`, `high`, `medium`, `low` |
| Subtarefas e checklist | Pedaços menores | Sim |
| Comentários e menções | Conversa dentro da tarefa, com `@pessoa` | Sim |
| Anexos | Arquivos | Fase 2 |
| Campos personalizados | Campos extras definidos pelo usuário | Fase 2 |
| Dependências | "Esta tarefa bloqueia aquela" | Fase 2 |
| Controle de tempo | Timer e horas lançadas | Fase 2 |
| Tags | Etiquetas livres | Backlog |
| Tarefas recorrentes | Repetir toda semana | Backlog |

## Visualizações (Views)

No ClickUp, os **mesmos dados** aparecem de jeitos diferentes. Uma View não guarda dados: ela só apresenta as
tarefas de um jeito. Por isso, no nosso código, toda view consome a **mesma API de tarefas**.

| View | Como mostra | Quem faz aqui | Fase |
|---|---|---|---|
| Lista | Linhas agrupadas por status, com colunas | Pessoa 2 | MVP |
| Quadro (Board/Kanban) | Colunas por status, cartões arrastáveis | Pessoa 3 | MVP |
| Calendário | Tarefas posicionadas pelo prazo | Pessoa 6 | Fase 2 |
| Gantt | Barras de início a prazo, com dependências | Pessoa 9 | Fase 2 |
| Tabela, Carga de trabalho, Mapa mental | Outras formas | — | Backlog |

## Colaboração

- **Membros e papéis:** pessoas convidadas para o workspace. No MVP os papéis são só `admin` e `membro`.
- **Comentários:** cada tarefa tem uma conversa própria.
- **Menções:** `@nome` notifica a pessoa.
- **Notificações:** a "caixa de entrada" do ClickUp mostra o que aconteceu com você (atribuído, mencionado, prazo chegando).

## Recursos avançados (Fase 2 e 3)

| Recurso | O que é | Fase |
|---|---|---|
| Campos personalizados | O admin cria campos (texto, número, data, dropdown) por projeto | 2 |
| Dependências | "Bloqueia / bloqueada por" | 2 |
| Controle de tempo | Timer na tarefa e relatório de horas | 2 |
| Automações | "Quando X acontecer, faça Y" (ex.: status = concluído → notificar dono) | 2 (backlog) |
| Dashboards | Painéis com gráficos | 3 |
| Docs | Documentos ligados ao projeto | 3 |
| Goals | Metas medidas por tarefas | 3 |
| Chat | Conversa por projeto | 3 |
| Whiteboards | Quadros brancos | 3 |
| IA (ClickUp Brain) | Resumir tarefas, gerar subtarefas | 3 |

## Planos do ClickUp (para referência de produto)

O ClickUp tem os planos Free Forever, Unlimited, Business e Enterprise. A IA é cobrada à parte. **Não teremos
cobrança no ClickUNICAP.** A informação só serve para entender que recursos o mercado considera básicos (o que é grátis)
e o que considera avançado (o que é pago).

## Glossário

| Termo | Significado no nosso código |
|---|---|
| Workspace | `workspaces`: a organização. Todo dado pertence a um workspace |
| Member | `workspace_members`: um usuário dentro de um workspace, com um papel |
| Project | `projects`: agrupador de tarefas |
| Task | `tasks`: unidade de trabalho |
| Subtask | `subtasks`: item filho de uma tarefa |
| Assignee | `tasks.assignee_id`: o responsável |
| Due date | `tasks.due_date`: o prazo |
| View | Uma tela que mostra tarefas (lista, kanban, calendário…). Não é uma tabela no banco no MVP |
| Slot | Espaço reservado na tela de detalhe da tarefa, onde outras features encaixam componentes |

## Fontes

- [Software Advice — ClickUp Overview 2026](https://www.softwareadvice.com/project-management/clickup-profile/)
- [Capterra — ClickUp](https://www.capterra.com/p/158833/clickup/)
- [Activepieces — How to Choose a ClickUp Pricing Plan in 2026](https://www.activepieces.com/blog/how-to-choose-a-clickup-pricing-plan-in-2026.md)
