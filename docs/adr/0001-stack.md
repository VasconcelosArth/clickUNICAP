# ADR 0001 — Stack do projeto

- **Status:** aceita
- **Data:** 2026-11-04
- **Autor:** Pessoa 1

## Contexto
Um time de 10 estudantes com níveis variados precisa construir um gerenciador de tarefas em paralelo. A stack
precisa ser conhecida no mercado, ter boa documentação (inclusive para IA) e impor organização.

## Decisão
TypeScript em tudo; **NestJS** no backend; **React + Vite** no frontend; **PostgreSQL** com **Drizzle ORM**;
monorepo com **pnpm workspaces**; infra local com **Docker Compose**.

## Alternativas consideradas
| Opção | Prós | Contras |
|---|---|---|
| Express puro | Simples | Sem estrutura: 10 pessoas criariam 10 padrões |
| **NestJS** | Módulos, DI e testes prontos; estrutura forçada | Curva inicial de decorators |
| Prisma | Muito popular | Schema em linguagem própria; geração de client; menos controle do SQL |
| **Drizzle** | Schema em TS, SQL explícito e tipado, leve | Menos "baterias inclusas" que o Prisma |
| Next.js | SSR, rotas prontas | O app é todo logado, SSR não traz ganho; mistura back e front |
| **React + Vite** | Simples, rápido, SPA pura | Rotas e dados ficam por nossa conta (React Router + TanStack Query) |

## Consequências
- Tipos compartilhados entre back e front via `packages/shared`.
- Todo mundo precisa de Node 22, pnpm e Docker.
- Migrations são SQL legível, revisado em PR.
