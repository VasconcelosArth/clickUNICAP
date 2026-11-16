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
pnpm --filter api db:seed           # dados de exemplo (ana@clickunicap.dev / senha123)
pnpm dev                            # compila o shared e sobe a API em :3000 e o frontend em :5173 (recarregam ao salvar)
pnpm test                           # testes unitários (não precisam do Docker)
pnpm --filter api test:e2e          # testes e2e (precisam do postgres-test no ar)
```

> Abra o frontend em http://localhost:5173. Ele chama a API pelo proxy do Vite, em `/api`.
> Se você instalou o Node agora, ative o pnpm com `corepack enable` ou `npm i -g pnpm@9`.

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

## E-mail com Resend

Por padrão (`MAIL_TRANSPORT=log`) nenhum e-mail sai: o conteúdo, com o link de recuperação de senha, aparece no
terminal da API. Para enviar de verdade pelo [Resend](https://resend.com):

1. Crie uma conta em https://resend.com e gere uma chave em **API Keys** (permissão *Sending access*).
2. No seu `.env` (nunca no `.env.example`):
   ```env
   MAIL_TRANSPORT=resend
   RESEND_API_KEY=re_sua_chave_aqui
   MAIL_FROM="ClickUNICAP <onboarding@resend.dev>"
   WEB_URL=http://localhost:5173
   ```
3. Reinicie a API. Se a chave faltar ou estiver errada, a API **não sobe** e diz qual variável corrigir.
4. Teste: `POST /api/auth/forgot-password` com o seu e-mail cadastrado.

**Limitações da conta gratuita sem domínio:** com o remetente `onboarding@resend.dev`, o Resend só entrega para o
e-mail **dono da conta Resend**. Para mandar para qualquer pessoa, verifique um domínio em **Domains** e troque o
`MAIL_FROM` para um endereço desse domínio (ex.: `no-reply@seudominio.com`).

**Se o Resend falhar** (chave revogada, domínio não verificado, limite atingido), a rota de recuperação continua
respondendo 204 para não revelar quais e-mails existem. O erro aparece no log da API como
`Falha ao enviar e-mail de recuperação`.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `port 5432 is already allocated` | Postgres instalado na máquina | Pare o serviço local ou mude `POSTGRES_PORT` no `.env` |
| API não sobe: "Missing env DATABASE_URL" | Falta o `.env` | `cp .env.example .env` |
| e2e falha com `ECONNREFUSED 5433` | Banco de teste parado | `docker compose up -d postgres-test` |
| Migration diz que a tabela já existe | Banco local com `push` antigo | `docker compose down -v && docker compose up -d && pnpm --filter api db:migrate` |
| API não sobe: "RESEND_API_KEY: Obrigatória quando MAIL_TRANSPORT=resend" | Chave ausente ou sem o prefixo `re_` | Coloque a chave no `.env` ou volte para `MAIL_TRANSPORT=log` |
| Recuperação de senha não chega | Remetente `onboarding@resend.dev` enviando para outro e-mail | Teste com o e-mail dono da conta Resend ou verifique um domínio |
| `429 Muitas tentativas` no login | Limite contra força bruta (5 por minuto por IP) | Espere 1 minuto |
| Windows: scripts quebram por causa de CRLF | Fim de linha | O `.gitattributes` força LF; rode `git add --renormalize .` |
