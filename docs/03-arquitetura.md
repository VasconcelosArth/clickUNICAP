# 03 — Arquitetura geral

O ClickUNICAP é um **monólito modular** num **monorepo**: um backend NestJS, um frontend React e um pacote de
contrato compartilhado, com banco Postgres acessado via Drizzle. Este documento explica a forma do sistema e o porquê
de cada escolha.

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Linguagem | TypeScript (strict) em tudo | Um só idioma; tipos compartilhados entre back e front |
| Gerenciador | pnpm workspaces | Monorepo leve, instalação rápida, um `node_modules` por pacote |
| Backend | NestJS 11 | Módulos, injeção de dependência e testes já vêm prontos; a estrutura força organização |
| ORM | Drizzle ORM + drizzle-kit | SQL explícito e tipado, sem "mágica"; migrations em SQL legível |
| Banco | PostgreSQL 16 | Relacional, robusto, com ótimo suporte a JSON e índices |
| Validação | Zod (em `packages/shared`) | Um schema serve para back, front e mocks |
| Frontend | React 19 + Vite | Rápido e simples, sem framework de SSR (é um app logado) |
| Dados no front | TanStack Query v5 | Cache, loading e erro do estado do servidor |
| Rotas no front | React Router v7 | Padrão de mercado |
| Formulários | React Hook Form + Zod | Validação com o mesmo schema do backend |
| Estado de UI | Zustand (só quando precisar) | Simples. Não usamos para dados do servidor |
| Estilo | Tailwind CSS + componentes próprios em `components/ui` | Consistência sem biblioteca pesada |
| Testes back | Jest (unit) + Supertest (e2e) + banco de teste no Docker | Padrão do NestJS |
| Testes front | Vitest + Testing Library + MSW | Rápido, mesma API do Jest |
| Testes ponta a ponta | Playwright | Fluxos críticos no navegador |
| Infra local | Docker Compose | Todo mundo com o mesmo banco |

> Por que **monólito modular** e não microsserviços? Somos 10 pessoas num projeto acadêmico com um banco só.
> Microsserviços trariam deploy, rede e consistência distribuída sem nenhum ganho. O monólito modular dá a
> **separação por dono** que precisamos (cada módulo é isolado) com a simplicidade de um deploy só. Ver
> [ADR 0002](adr/0002-monolito-modular.md).

## Visão do sistema

```
┌──────────────────────────────┐        HTTP/JSON (/api/*)        ┌──────────────────────────────────┐
│  apps/web (React + Vite)     │ ───────────────────────────────▶ │  apps/api (NestJS)               │
│                              │ ◀─────────────────────────────── │                                  │
│  features/  ─┐               │      cookie httpOnly (JWT)       │  modules/ ─┐                     │
│  shared UI   │ usa tipos de  │                                  │  core/     │ usa schemas de    │
└──────────────┼───────────────┘                                  └────────────┼─────────┬─────────┘
               │                                                               │         │ Drizzle
               ▼                                                               ▼         ▼
        ┌─────────────────────────────────────────────┐               ┌────────────────────────┐
        │ packages/shared  (schemas Zod, tipos, enums) │               │ PostgreSQL 16 (Docker) │
        └─────────────────────────────────────────────┘               └────────────────────────┘
```

## Estrutura do monorepo

```
clickUNICAP/
├── AGENTS.md                 # contexto para IA (ler primeiro)
├── CLAUDE.md                 # aponta para AGENTS.md
├── README.md
├── docker-compose.yml        # Postgres de dev + Postgres de teste + Adminer
├── .env.example
├── package.json              # scripts da raiz (dev, test, lint) — pnpm workspaces
├── pnpm-workspace.yaml
├── docs/                     # você está aqui
├── apps/
│   ├── api/                  # backend NestJS  → ver 04-backend-guia.md
│   └── web/                  # frontend React  → ver 05-frontend-guia.md
└── packages/
    └── shared/               # contrato: schemas Zod, tipos, enums, constantes
        └── src/
            ├── schemas/      # task.schema.ts, project.schema.ts, ...
            ├── enums/        # task-status.ts, task-priority.ts, member-role.ts
            └── index.ts
```

## Regras de dependência

Quem pode importar quem. **Isso é verificado no lint** (`eslint-plugin-boundaries` / `import/no-restricted-paths`).

```
packages/shared   ← não importa nada do projeto (só zod)
apps/api          → pode importar packages/shared
apps/web          → pode importar packages/shared
apps/api  ✗ apps/web   (nunca)
apps/web  ✗ apps/api   (nunca)
```

Dentro do backend:

```
modules/<x>/controller → service → repository → database
modules/<x>  ✗  modules/<y>/repository   (nunca acessar o repositório de outro módulo)
modules/<x>  →  modules/<y> só pelo service EXPORTADO no <y>.module.ts, ou por evento
core/        ← usado por todos; não importa nenhum módulo
```

Dentro do frontend:

```
app/ → features/ → components/ui, lib/, hooks/
features/<x>  ✗  features/<y>   (features não se importam; compõem-se no app/ ou por slots)
```

## Fluxo de uma requisição (exemplo: criar tarefa)

```
1. Usuário preenche o formulário em features/tasks/components/CreateTaskForm.tsx
2. React Hook Form valida com createTaskSchema (de @clickunicap/shared)
3. useCreateTask() (TanStack Query) → POST /api/projects/:projectId/tasks
4. JwtAuthGuard confere o cookie e põe o usuário em request.user
5. ZodValidationPipe valida o body com o MESMO createTaskSchema
6. TasksController.create() chama TasksService.create(user, projectId, dto)
7. TasksService confere a permissão (membro do workspace?) e aplica a regra de negócio
8. TasksRepository.insert() executa o SQL via Drizzle
9. TasksService emite o evento 'task.assigned' (se houver responsável)
10. NotificationsListener (outro módulo) reage ao evento e cria a notificação
11. Resposta 201 com a tarefa → TanStack Query invalida ['tasks', projectId] → a lista atualiza
```

## Multi-tenancy (isolamento por workspace)

**Todo dado pertence a um workspace.** Uma pessoa nunca pode ver dados de um workspace do qual não é membro.

- Todas as tabelas de negócio têm `workspace_id`, direto ou pelo pai (a tarefa pertence ao projeto, que pertence ao workspace).
- Toda query de repository **filtra por workspace**. Um repository nunca expõe `findById(id)` sem escopo:
  usa `findById(workspaceId, id)`.
- O `WorkspaceMemberGuard` confere se o usuário é membro antes de chegar no controller.
- Existe teste e2e que tenta acessar dado de outro workspace e espera **404** (não 403, para não revelar que o dado existe).

## Autenticação (resumo)

- Senha com **argon2id**.
- **Access token** JWT de 15 minutos e **refresh token** de 7 dias, os dois em **cookies httpOnly, Secure, SameSite=Lax**.
  O frontend nunca toca no token (nada de `localStorage`).
- O refresh token é guardado como hash no banco (`refresh_tokens`) e pode ser revogado no logout.
- Detalhes em [04 — Backend](04-backend-guia.md#autenticação-e-autorização).

## Convenções de API

| Regra | Exemplo |
|---|---|
| Prefixo `/api`, recursos no plural, kebab-case | `/api/projects/:projectId/tasks` |
| Aninhar no máximo 1 nível | `/api/tasks/:taskId/comments` (e não `/projects/:p/tasks/:t/comments`) |
| Verbos HTTP corretos | `GET` lista/detalhe, `POST` cria, `PATCH` altera parcialmente, `DELETE` remove |
| Ações que não são CRUD | `POST /api/tasks/:id/move` (Kanban) |
| JSON em camelCase | `{ "dueDate": "2026-11-20" }` (o banco é snake_case; o Drizzle converte) |
| Datas em ISO 8601 UTC | `"2026-11-04T18:30:00.000Z"` |
| IDs são UUID | `"3f2a9c1e-..."` |
| Paginação por cursor nas listas grandes | `?limit=50&cursor=<id>` → `{ data, nextCursor }` |
| Erro padrão | `{ "statusCode": 422, "error": "VALIDATION_ERROR", "message": "...", "details": [...] }` |
| Documentação | Swagger em `http://localhost:3000/api/docs` |

## Observabilidade mínima

- Logger estruturado (`nestjs-pino`), com um `requestId` por requisição.
- `GET /api/health` responde se a API e o banco estão no ar.
- Nunca logar senha, token ou corpo de requisição de auth.

## Decisões registradas

| ADR | Decisão |
|---|---|
| [0001](adr/0001-stack.md) | Stack: NestJS, React, Drizzle, Postgres, pnpm |
| [0002](adr/0002-monolito-modular.md) | Monólito modular em monorepo |
| [0003](adr/0003-contrato-zod-compartilhado.md) | Contrato com Zod em `packages/shared` |

## Fontes consultadas

- [NestJS best practices (developer-kit)](https://supercode.sh/en/skills/giuseppe-trisciuoglio/developer-kit/nestjs-best-practices): camadas controller → service → repository e encapsulamento de módulo.
- [Repository pattern in NestJS with Drizzle ORM (Medium)](https://medium.com/@vimulatus/repository-pattern-in-nest-js-with-drizzle-orm-e848aa75ecae): provider do Drizzle e transações com `nestjs-cls`.
- [Implementing Repository Pattern with Drizzle in NestJS](https://gurubase.io/g/nodejs/implementing-repository-pattern-drizzle-nestjs)
- [Bulletproof React patterns](https://skills.sh/grahamcrackers/skills/bulletproof-react-patterns): estrutura do frontend por feature.
- [Structuring large frontend projects with React (DEV)](https://dev.to/akshaykurve/structuring-large-frontend-projects-with-react-without-losing-your-mind-3k0i): TanStack Query para estado do servidor, separado do estado de UI.
- [Feature-based React architecture that actually scales (DEV)](https://dev.to/matkarimov099/feature-based-react-architecture-that-actually-scales-fe4)
