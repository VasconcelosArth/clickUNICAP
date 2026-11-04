# ClickUNICAP

Gerenciador de tarefas e projetos inspirado no ClickUp: workspaces, projetos, tarefas com responsável, prazo,
status e prioridade, e as visões Lista, Kanban, Calendário e Gantt.

Projeto acadêmico desenvolvido por um time de 10 pessoas.

## Stack

NestJS · React + Vite · PostgreSQL · Drizzle ORM · TanStack Query · Zod · pnpm workspaces · Docker Compose

## Começando

```bash
cp .env.example .env
docker compose up -d       # Postgres (5432), Postgres de teste (5433), Adminer (8080)
pnpm install
pnpm --filter api db:migrate
pnpm dev                   # API http://localhost:3000/api · Web http://localhost:5173
```

Passo a passo completo: [docs/10-ambiente-local.md](docs/10-ambiente-local.md).

## Documentação

Comece por **[docs/README.md](docs/README.md)**. Usa IA para programar? Leia o **[AGENTS.md](AGENTS.md)**.

| | |
|---|---|
| [Como o ClickUp funciona](docs/01-clickup-referencia.md) | [Organização do time](docs/02-organizacao-do-projeto.md) |
| [Arquitetura](docs/03-arquitetura.md) | [Guia do backend](docs/04-backend-guia.md) |
| [Guia do frontend](docs/05-frontend-guia.md) | [Banco de dados](docs/06-banco-de-dados.md) |
| [Testes](docs/07-testes.md) | [Boas práticas](docs/08-boas-praticas.md) |
| [Desenvolvimento com IA](docs/09-guia-ia.md) | [Ambiente local](docs/10-ambiente-local.md) |

## Estrutura

```
apps/api          backend NestJS
apps/web          frontend React
packages/shared   contrato (schemas Zod, tipos, enums)
docs/             documentação e ADRs
```
