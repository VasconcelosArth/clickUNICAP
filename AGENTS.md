# AGENTS.md — Contexto para assistentes de IA

> Arquivo lido automaticamente por agentes de código (Claude Code, Cursor, Copilot, Codex).
> Humanos também devem ler. A documentação completa está em [`docs/`](docs/README.md).

## O projeto

**ClickUNICAP** é um gerenciador de tarefas e projetos inspirado no ClickUp (projeto acadêmico de um time de 10
pessoas). Hierarquia: **Workspace → Project → Task → Subtask**. Views: Lista, Kanban, Calendário e Gantt, todas sobre
a mesma API de tarefas. Referência do produto: [`docs/01-clickup-referencia.md`](docs/01-clickup-referencia.md).

## Stack (não troque sem um ADR)

- Monorepo **pnpm workspaces**: `apps/api` (NestJS 11), `apps/web` (React 19 + Vite), `packages/shared` (Zod).
- Banco **PostgreSQL 16** via **Drizzle ORM** (`drizzle-kit` para migrations). Docker Compose para a infra local.
- Front: **TanStack Query v5**, React Router v7, React Hook Form + Zod, Tailwind, Zustand (só estado de UI), MSW.
- Testes: **Jest + Supertest** (api), **Vitest + Testing Library + MSW** (web e shared), **Playwright** (e2e).
- Auth: JWT em **cookie httpOnly** (access 15 min, refresh 7 dias), senha com **argon2**.

## Comandos

```bash
docker compose up -d                 # postgres :5432, postgres-test :5433, adminer :8080
pnpm install
pnpm dev                             # api :3000 + web :5173
pnpm test                            # todos os testes
pnpm --filter api test -- <arquivo>  # um teste do backend
pnpm --filter api test:e2e           # e2e do backend (precisa do postgres-test)
pnpm --filter web test               # testes do frontend
pnpm lint && pnpm typecheck          # o mesmo que o CI
pnpm --filter api db:generate --name <nome>   # gera migration após mudar o schema
pnpm --filter api db:migrate
```

## Regras obrigatórias

### Gerais
1. **Tipos e validação vêm de `@clickunicap/shared`** (schemas Zod). Nunca redefina `Task`, `Project` etc. no back ou no front.
2. **Teste junto com o código, no mesmo PR.** Função ou rota nova sem teste = não está pronta.
3. **Rode os testes antes de commitar.** Se falhar, não commite; informe qual teste quebrou.
4. Código em **inglês**; textos da UI, docs e commits em **português**. Conventional Commits.
5. Proibido: `any`, `@ts-ignore`, `console.log` commitado, `process.env` fora de `core/config`, segredos no código.
6. **Não adicione dependências** fora da stack sem pedir confirmação.
7. Mexa só nos arquivos do escopo pedido. `packages/shared`, `apps/api/src/core` e migrations existentes exigem cuidado extra: pergunte antes.

### Backend (`apps/api`) — detalhes em [`docs/04-backend-guia.md`](docs/04-backend-guia.md)
- Um módulo por domínio em `src/modules/<nome>/`: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.spec.ts`.
- **Controller** só lida com HTTP e chama o service. **Service** tem a regra de negócio. **Repository** tem o SQL (Drizzle).
- **Toda query filtra por `workspaceId`** (multi-tenant). Acessar dado de outro workspace devolve **404**.
- Validação com `ZodValidationPipe(schemaDoShared)`. **Não use class-validator.**
- Erros: lance as classes de `src/core/errors` (`NotFoundError`, `ForbiddenError`, `DomainError`…), nunca `HttpException` no service.
- Módulos não importam o repository de outro módulo: usam o **service exportado** ou **eventos** (`src/core/events`).
- Transações com `@Transactional()` (`@nestjs-cls/transactional`).
- Schema Drizzle em `src/core/database/schema/<dominio>.ts`; migrations geradas, revisadas, **nunca editadas** depois do merge.

### Frontend (`apps/web`) — detalhes em [`docs/05-frontend-guia.md`](docs/05-frontend-guia.md)
- Organização **por feature** em `src/features/<nome>/` (`api/`, `components/`, `hooks/`, `mocks/`, `pages/`, `index.ts`).
- **Features não importam outras features** (exceção: a API pública de `features/tasks`: `taskKeys`, `useTasks`, `useUpdateTask`).
- Dados do servidor **só com TanStack Query** (nada de `useEffect` + `fetch`). HTTP só via `src/lib/api-client.ts`.
- Filtros e abas na **URL**. Zustand só para estado global de UI.
- A tela de detalhe da tarefa é estendida por **slots** (`src/app/slots/`), não editando o componente da base.
- Toda tela trata **loading, erro e vazio**. Acessibilidade: labels, `aria-label`, teclado.

### Banco — detalhes em [`docs/06-banco-de-dados.md`](docs/06-banco-de-dados.md)
- `snake_case`, tabelas no plural, `uuid` como PK, `timestamptz`, índice em toda FK.
- Enums: status `todo | in_progress | done`; prioridade `low | medium | high | urgent`; papel `admin | member`.

## Donos (não edite o módulo de outro dono sem combinar)

| Pessoa | Backend `modules/` | Frontend `features/` |
|---|---|---|
| 1 | `auth`, `users`, `workspaces`, `projects`, `tasks`, `core/` | `auth`, `workspaces`, `projects`, `tasks`, `app/`, `components/ui` |
| 2 | (filtros em `tasks`) | `task-list` |
| 3 | (mover em `tasks`) | `kanban` |
| 4 | `subtasks`, `comments` | `subtasks`, `comments` |
| 5 | `notifications` | `notifications` |
| 6 | — | `calendar` |
| 7 | `attachments` | `attachments` |
| 8 | `custom-fields` | `custom-fields` |
| 9 | `dependencies` | `dependencies`, `gantt` |
| 10 | `time-tracking` | `time-tracking` |

## Antes de entregar uma tarefa, confira

- [ ] Segue as camadas e as fronteiras acima.
- [ ] Testes escritos e passando (`pnpm test`), incluindo o caso de outro workspace nas rotas.
- [ ] `pnpm lint` e `pnpm typecheck` sem erro.
- [ ] Docs atualizados se mudou regra, rota, tabela ou convenção.
- [ ] Checklist completo em [`docs/09-guia-ia.md`](docs/09-guia-ia.md#4-checklist-de-revisão-de-código-gerado-por-ia).
