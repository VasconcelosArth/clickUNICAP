# 02 — Organização do projeto e do time

Este documento diz **quem faz o quê, em que ordem e como as partes se juntam**. O time tem 10 pessoas. A Pessoa 1
constrói a base do sistema, as Pessoas 2 a 5 fazem o resto do MVP e as Pessoas 6 a 10 fazem a Fase 2.

## Fases do produto

| Fase | Objetivo | Conteúdo |
|---|---|---|
| **MVP** | Um time consegue organizar e acompanhar tarefas | Login, workspace, membros, projetos, tarefas, subtarefas, comentários, Lista, Kanban, filtros, notificações |
| **Fase 2** | Recursos de gestão de projeto | Calendário, anexos, campos personalizados, dependências + Gantt, controle de tempo, automações |
| **Fase 3** | Plataforma completa | Dashboards, docs, metas, chat, whiteboard, integrações, IA |

## Ordem de construção: backend e frontend em paralelo

**Regra do projeto:** o frontend começa agora, junto com o backend que ainda falta, mas **só entra no frontend o que já
tem rota implementada no backend**. A tela de cada frente começa quando a rota dela estiver pronta.

```
Etapa 0 ─ Fundação (Pessoa 1) ......................... ✅ feita
          monorepo, packages/shared, API NestJS, banco completo (17 tabelas) + migrations, Docker
              │
Etapa 1 ─ BACKEND do MVP (todos, em paralelo) .......... ⏳ agora
          Pessoa 1: auth, workspaces, projects, tasks        Pessoa 4: subtasks, comments
          Pessoa 2: filtros/busca/my-tasks em tasks          Pessoa 5: notifications
          Pessoa 3: rota de mover/reordenar (Kanban)
          Pessoas 6–10: backend da Fase 2 (as tabelas já existem)
              │   critério de saída: rotas no Swagger + testes unitários e e2e passando
              ▼
Etapa 2 ─ FRONTEND (em paralelo com a Etapa 1) ......... ⏳ agora
          Pessoa 1: setup do apps/web, layout, components/ui, auth e telas da base, slots
          demais: a feature de cada frente, depois que a rota dela existir
              │
Etapa 3 ─ Integração, ponta a ponta (Playwright) e backlog reserva
```

**O setup do `apps/web` e as telas da base já existem.** Cada frente cria a própria tela quando a rota dela estiver
pronta. Até lá, quem terminar o próprio backend pode ajudar a fechar o backend de outra frente, escrever testes e2e de fluxos entre módulos
ou pegar o backend de um item do backlog reserva. Todas as telas seguem o [guia de design](11-design-guia.md).

## As 10 frentes

Cada frente tem **um dono**. O dono é responsável pelo módulo no backend, pela feature no frontend, pelas
tabelas e pelos testes da frente.

| Pessoa | Frente | Módulo backend (`apps/api/src/modules/`) | Feature frontend (`apps/web/src/features/`) | Fase |
|---|---|---|---|---|
| 1 | **Base do sistema** | `auth`, `users`, `workspaces`, `projects`, `tasks` + `core/` | `auth`, `workspaces`, `projects`, `tasks` + `app/`, `components/ui` | MVP |
| 2 | Lista, filtros e "Minhas tarefas" | usa `tasks` (adiciona filtros na query) | `task-list` | MVP |
| 3 | Kanban | usa `tasks` (rota de mover/reordenar) | `kanban` | MVP |
| 4 | Subtarefas e comentários | `subtasks`, `comments` | `subtasks`, `comments` | MVP |
| 5 | Notificações | `notifications` | `notifications` | MVP |
| 6 | Calendário | usa `tasks` | `calendar` | 2 |
| 7 | Anexos | `attachments` | `attachments` | 2 |
| 8 | Campos personalizados | `custom-fields` | `custom-fields` | 2 |
| 9 | Dependências + Gantt | `dependencies` | `dependencies`, `gantt` | 2 |
| 10 | Controle de tempo | `time-tracking` | `time-tracking` | 2 |

### Detalhe da Pessoa 1 (base)

A base é o que **todo mundo usa**, então ela vem primeiro e precisa de prazo curto.

**Etapa 0 — Fundação (feita):**
- [x] Monorepo pnpm (`apps/api`, `packages/shared`), TypeScript strict, ESLint e Prettier.
- [x] `docker compose up` sobe o Postgres de dev e o de teste.
- [x] Schema Drizzle com **todas as 17 tabelas** do [modelo de dados](06-banco-de-dados.md) e as migrations iniciais.
- [x] `packages/shared` com enums e schemas Zod de `User`, `Workspace`, `Project` e `Task` (com testes).
- [x] API NestJS: config validada, módulo de banco, erros de domínio, filtro de erros, `ZodValidationPipe`, `/api/health`.
- [x] Infra de testes: Jest (unitário) e e2e contra o banco de teste.

**Etapa 1 — Backend da base (prioridade: destravar o time):**
- [x] `core/auth`: `JwtAuthGuard` global, `@Public()`, `@CurrentUser()`.
- [x] Módulo `auth`: cadastro, login, logout, refresh com rotação, recuperar senha. Módulo `users`: `GET/PATCH /api/users/me`.
- [x] `core/guards`: `WorkspaceMemberGuard`, `RolesGuard`, `@Roles()`, `@CurrentWorkspace()`, `@CurrentMembership()`.
- [x] Módulo `workspaces`: CRUD, membros, papéis, convites por e-mail (exporta `WorkspacesService.isMember()`).
- [x] Módulos `projects` e `tasks`: CRUD com filtro por workspace, exportando `TasksService` para as outras frentes.
- [x] Swagger em `/api/docs`; eventos de domínio (`core/events`); factories de teste e `db:seed`.
- [x] CI no GitHub Actions; hooks de pre-commit (lint, testes) e de mensagem de commit.

**Etapa 2 — Frontend da base (em paralelo com a Etapa 1):**
- [x] Setup do `apps/web`, layout (menu lateral, topo, rotas), `components/ui`, cliente HTTP.
- [x] Telas de auth, workspaces, projetos e detalhe da tarefa com os **slots** (ver abaixo).

### Detalhe das outras frentes

Escopo, critérios de aceite e dependências de cada frente estão no PDF de divisão
(`MVP_ClickUp_Divisao_Atividades.pdf`) e devem virar issues no GitHub, uma por entregável.

## Como as frentes ficam independentes

Três mecanismos deixam cada pessoa trabalhar sem esperar as outras:

### 1. O contrato compartilhado (`packages/shared`)

Toda entidade tem um **schema Zod** em `packages/shared/src/schemas/`. Dele saem:
- o tipo TypeScript, usado no backend e no frontend;
- a validação do body no backend;
- a validação de formulário no frontend;
- os **dados falsos (mocks)** usados nos testes do frontend.

Mudar um schema compartilhado exige um PR revisado pela Pessoa 1 e aviso no grupo.

### 2. Mocks de rotas que já existem

O frontend usa **MSW (Mock Service Worker)** para simular rotas **já implementadas**, nos testes e para rodar a tela sem
subir a API, com handlers em `apps/web/src/features/<feature>/mocks/`. Mock não libera tela de rota que ainda não existe.

### 3. Slots na tela de detalhe da tarefa

A tela de detalhe da tarefa (da Pessoa 1) tem **espaços reservados**. Cada frente registra o seu componente
sem editar o arquivo da base:

| Slot | Quem preenche |
|---|---|
| `task-detail.main` | Subtarefas (4), Campos personalizados (8) |
| `task-detail.activity` | Comentários (4) |
| `task-detail.sidebar` | Controle de tempo (10), Dependências (9) |
| `task-detail.attachments` | Anexos (7) |

Como funciona está em [05 — Frontend](05-frontend-guia.md#slots-da-tela-de-tarefa).

### 4. Eventos de domínio no backend

Quando uma coisa acontece (tarefa atribuída, comentário com menção), o módulo **emite um evento** em vez
de chamar o módulo de notificações diretamente. Assim a Pessoa 5 assina os eventos, e as Pessoas 1 e 4 não precisam
conhecer o código dela. Ver [04 — Backend](04-backend-guia.md#eventos-de-domínio).

## Backlog reserva

Quem terminar a própria frente pega o primeiro item livre, **avisa no grupo** e abre a issue no seu nome:

1. Automações simples (quando status = X, fazer Y)
2. Tarefas recorrentes
3. Templates de projeto e de tarefa
4. Dashboard básico
5. Docs ligados ao projeto
6. Goals / metas
7. Chat por projeto
8. Whiteboard
9. Integrações (Slack, Google Drive)
10. IA (resumo de tarefa, gerar subtarefas)

## Ritmo do time

| Quando | O quê |
|---|---|
| Dia 1 | Reunião de contrato: todos leem estes docs e fecham o modelo de dados |
| Toda semana, dia fixo | **Dia de integração**: todo mundo faz merge na `main` e testa o fluxo completo junto |
| Diariamente (assíncrono) | Mensagem no grupo: o que fiz, o que vou fazer, se estou travado |
| Ao terminar uma frente | Demo rápida para o grupo e puxar item do backlog reserva |

## Riscos e como lidar

| Risco | Plano |
|---|---|
| A base (Pessoa 1) atrasa | Todos seguem no backend da própria frente. Quem terminar primeiro ajuda a Pessoa 1 |
| Alguém muda o contrato sem avisar | O CI falha (tipos quebram). Toda mudança em `packages/shared` precisa de revisão da Pessoa 1 |
| Dois mexendo no mesmo arquivo | Respeitar donos (arquivo `CODEOWNERS`). Na dúvida, perguntar antes |
| Código gerado por IA fora do padrão | A revisão de PR checa o [checklist de IA](09-guia-ia.md#checklist-de-revisão-de-código-gerado-por-ia) |
