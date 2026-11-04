# 10 — Ambiente local e Docker

Como deixar o projeto rodando na sua máquina. O `docker-compose.yml` da raiz sobe **a infraestrutura** (bancos e
Adminer). A API e o frontend rodam no seu terminal com `pnpm dev`, para ter recarga rápida e debug fácil.

## Pré-requisitos

| Ferramenta | Versão | Verificar |
|---|---|---|
| Node.js | 22 LTS | `node -v` |
| pnpm | 9+ (`corepack enable`) | `pnpm -v` |
| Docker Desktop | recente | `docker compose version` |
| Git | recente | `git --version` |

## Primeira vez

```bash
git clone <url-do-repo> clickUNICAP && cd clickUNICAP
cp .env.example .env                # ajuste se quiser; os padrões funcionam
docker compose up -d                # sobe postgres (5432), postgres-test (5433) e adminer (8080)
pnpm install
pnpm --filter api db:migrate        # cria as tabelas
pnpm --filter api db:seed           # dados de exemplo (opcional)
pnpm dev                            # API em :3000 e web em :5173
```

> Os comandos `pnpm` só funcionam depois que a Pessoa 1 criar `apps/api`, `apps/web` e `packages/shared` (semana 1).
> Até lá, o `docker compose up -d` já funciona.

## Serviços do Docker Compose

| Serviço | Porta | Para quê | Dados |
|---|---|---|---|
| `postgres` | 5432 | Banco de desenvolvimento | Volume `pgdata` (persiste entre reinícios) |
| `postgres-test` | 5433 | Banco dos testes e2e | `tmpfs` (em memória, zera ao reiniciar, é rápido) |
| `adminer` | 8080 | Ver e editar o banco pelo navegador | — |

Perfil opcional `app` (`docker compose --profile app up`): sobe também a API e o web em contêiner, para quem não
quer instalar Node. Funciona depois que existirem os `Dockerfile` em `apps/api` e `apps/web`.

## URLs

| O quê | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |
| Health | http://localhost:3000/api/health |
| Adminer | http://localhost:8080 (servidor `postgres`, usuário e senha do `.env`) |

## Comandos úteis

```bash
docker compose ps                     # o que está rodando
docker compose logs -f postgres       # logs do banco
docker compose down                   # para tudo (mantém os dados)
docker compose down -v                # para e APAGA o banco de dev (cuidado)
pnpm --filter api db:studio           # Drizzle Studio
pnpm lint && pnpm typecheck && pnpm test   # o mesmo que o CI roda
```

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `port 5432 is already allocated` | Postgres instalado na máquina | Pare o serviço local ou mude `POSTGRES_PORT` no `.env` |
| API não sobe: "Missing env DATABASE_URL" | Falta o `.env` | `cp .env.example .env` |
| e2e falha com `ECONNREFUSED 5433` | Banco de teste parado | `docker compose up -d postgres-test` |
| Migration diz que a tabela já existe | Banco local com `push` antigo | `docker compose down -v && docker compose up -d && pnpm --filter api db:migrate` |
| Windows: scripts quebram por causa de CRLF | Fim de linha | O `.gitattributes` força LF; rode `git add --renormalize .` |
