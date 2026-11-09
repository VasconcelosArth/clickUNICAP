# ClickUNICAP

Gerenciador de tarefas e projetos inspirado no ClickUp: workspaces, projetos, tarefas com responsável, prazo,
status e prioridade, e as visões Lista, Kanban, Calendário e Gantt.

Projeto acadêmico desenvolvido por um time de 10 pessoas.

## Stack

NestJS · React + Vite · PostgreSQL · Drizzle ORM · TanStack Query · Zod · pnpm workspaces · Docker Compose

## Como rodar

Você precisa de **Node.js 22+**, **pnpm 9+** (`corepack enable`) e do **Docker Desktop aberto**. Rode tudo na pasta
raiz do projeto.

### Primeira vez

```bash
cp .env.example .env                # cria a configuração local; os valores padrão funcionam
pnpm install                        # instala as dependências
docker compose up -d                # sobe os bancos de dados
pnpm --filter api db:migrate        # cria as tabelas
pnpm --filter api db:seed:demo      # opcional: preenche o banco com dados fictícios
pnpm dev                            # sobe a API e o frontend
```

Abra http://localhost:5173. Com os dados fictícios, entre com `ana@clickunicap.dev` e a senha `senha123`.

### No dia a dia

```bash
docker compose up -d                # com o Docker Desktop aberto
pnpm dev                            # para encerrar, Ctrl+C no terminal
```

Depois de um `git pull`, rode também `pnpm install` e `pnpm --filter api db:migrate`.

### Endereços

| O quê | Onde |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| Documentação da API (Swagger) | http://localhost:3000/api/docs |
| Adminer, para ver o banco | http://localhost:8080 |

### Comandos úteis

| Comando | Para quê |
|---|---|
| `pnpm --filter api db:seed:demo seu@email.com` | Coloca os dados fictícios em uma conta já criada pelo app |
| `pnpm --filter web dev` | Sobe só o frontend |
| `pnpm --filter api dev` | Sobe só a API |
| `pnpm test` | Roda os testes unitários (não precisa do Docker) |
| `pnpm --filter api test:e2e` | Roda os testes e2e da API (precisa do Docker) |
| `pnpm lint` e `pnpm typecheck` | Rodam as mesmas verificações do CI |
| `pnpm build` | Gera a versão de produção |
| `docker compose down` | Desliga os bancos, mantendo os dados |

### Se algo não funcionar

| Sintoma | O que fazer |
|---|---|
| Login dá erro de conexão | Confira se o Docker está aberto e se o `pnpm dev` subiu a API sem erro |
| `Configuração inválida no .env` | Faltou algum valor: compare o seu `.env` com o `.env.example` |
| Erro de coluna ou tabela inexistente | Rode `pnpm --filter api db:migrate` |
| Link de convite ou de recuperação de senha | Em desenvolvimento, o e-mail não é enviado: o link aparece no terminal da API |

Mais detalhes em [docs/10-ambiente-local.md](docs/10-ambiente-local.md).

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
