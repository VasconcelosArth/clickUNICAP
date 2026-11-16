# 06 — Banco de dados (PostgreSQL + Drizzle)

Este documento é o **modelo de dados oficial** e as regras para mexer no banco. Toda tabela nova entra aqui no
mesmo PR da migration.

## Convenções

| Regra | Exemplo |
|---|---|
| Nomes em **inglês**, `snake_case`, tabelas no **plural** | `tasks`, `workspace_members`, `due_date` |
| No TypeScript, camelCase (o Drizzle converte com `casing: 'snake_case'`) | `task.dueDate` |
| Chave primária `id uuid default gen_random_uuid()` | — |
| Toda tabela tem `created_at` e, se for editável, `updated_at` (`timestamptz`) | — |
| Toda FK tem índice | `index('tasks_project_id_idx').on(t.projectId)` |
| Enums do Postgres para conjuntos fixos, **espelhados** em `packages/shared/src/enums` | `task_status` |
| Dinheiro e horas sem float: inteiros (centavos, minutos) | `time_entries.minutes integer` |
| Exclusão: `on delete cascade` para filhos "de dentro" (subtarefas, comentários); `restrict` para referências a usuários | — |
| Arquivamento em vez de exclusão para projetos: `archived_at timestamptz null` | — |

> O PDF de divisão usou nomes de campos em português (`responsavel_id`, `prazo`) só para explicar a ideia.
> **Os nomes oficiais são os deste documento, em inglês.**

## Modelo de dados

### Base (Pessoa 1)

```
users
  id              uuid pk
  name            text not null
  email           citext unique not null
  password_hash   text not null
  avatar_url      text null
  created_at, updated_at

refresh_tokens
  id              uuid pk
  user_id         uuid fk users  (cascade)
  token_hash      text not null
  expires_at      timestamptz not null
  revoked_at      timestamptz null

password_reset_tokens
  id, user_id fk, token_hash, expires_at, used_at

workspaces
  id              uuid pk
  name            text not null
  owner_id        uuid fk users
  created_at, updated_at

workspace_members                      -- PK composta (workspace_id, user_id)
  workspace_id    uuid fk workspaces (cascade)
  user_id         uuid fk users (cascade)
  role            member_role not null default 'member'   -- enum: admin | member
  joined_at       timestamptz

workspace_invites
  id, workspace_id fk, email citext, role member_role, token_hash, invited_by fk users,
  expires_at, accepted_at null

projects
  id              uuid pk
  workspace_id    uuid fk workspaces (cascade)
  name            text not null
  description     text null
  color           text null
  archived_at     timestamptz null
  created_by      uuid fk users
  created_at, updated_at

tasks
  id              uuid pk
  project_id      uuid fk projects (cascade)
  title           text not null
  description     text null
  status          task_status not null default 'todo'        -- enum: todo | in_progress | done
  priority        task_priority not null default 'medium'    -- enum: low | medium | high | urgent
  assignee_id     uuid fk users null (set null)
  start_date      date null
  due_date        date null
  position        double precision not null   -- ordem na coluna do Kanban (ver abaixo)
  created_by      uuid fk users
  completed_at    timestamptz null
  created_at, updated_at
  índices: (project_id, status, position), (assignee_id), (due_date)
```

> **Status em inglês no banco e na API** (`todo`, `in_progress`, `done`). A tela mostra "A fazer",
> "Em andamento", "Concluído" pelo mapa de rótulos `TASK_STATUS_LABELS`, em `packages/shared/src/enums/index.ts`.

### MVP: outras frentes

```
subtasks                        (Pessoa 4)
  id, task_id fk tasks (cascade), title text, is_done boolean default false,
  position double precision, created_at, updated_at

comments                        (Pessoa 4)
  id, task_id fk tasks (cascade), author_id fk users, body text, created_at, updated_at

comment_mentions                (Pessoa 4)
  comment_id fk (cascade), user_id fk     -- PK composta

notifications                   (Pessoa 5)
  id, user_id fk (cascade), workspace_id fk (cascade),
  type notification_type   -- enum: task_assigned | comment_mentioned | task_due_soon
  ref_id uuid, payload jsonb, read_at timestamptz null, created_at
  índice: (user_id, read_at, created_at desc)
```

### Fase 2

```
attachments                     (Pessoa 7)
  id, task_id fk (cascade), uploaded_by fk users, file_name text, mime_type text,
  size_bytes integer, storage_key text, created_at

custom_fields                   (Pessoa 8)
  id, project_id fk (cascade), name text, type custom_field_type  -- text|number|date|dropdown|checkbox
  options jsonb null (para dropdown), is_required boolean, position, created_at

task_custom_field_values        (Pessoa 8)
  task_id fk (cascade), field_id fk custom_fields (cascade), value jsonb   -- PK composta

task_dependencies               (Pessoa 9)
  task_id fk tasks (cascade)            -- a tarefa bloqueada
  depends_on_task_id fk tasks (cascade) -- a que bloqueia
  created_at                            -- PK composta; check (task_id <> depends_on_task_id)

time_entries                    (Pessoa 10)
  id, task_id fk (cascade), user_id fk, started_at timestamptz, ended_at timestamptz null,
  minutes integer null (preenchido ao parar ou no lançamento manual), note text null, created_at
  índice único parcial: (user_id) where ended_at is null   -- garante 1 timer ativo por usuário
```

## Onde está cada tabela no código

Todas as tabelas já existem (Etapa 0). Cada frente **usa** a sua; para alterar, edite o arquivo e gere uma migration.

| Arquivo em `apps/api/src/core/database/schema/` | Tabelas |
|---|---|
| `_columns.ts` | helpers `id()`, `timestamps()`, `createdAt()`, `citext` |
| `enums.ts` | `member_role`, `task_status`, `task_priority`, `notification_type`, `custom_field_type` (valores vindos do shared) |
| `users.ts` | `users`, `refresh_tokens`, `password_reset_tokens` |
| `workspaces.ts` | `workspaces`, `workspace_members`, `workspace_invites` |
| `projects.ts` | `projects` |
| `tasks.ts` | `tasks` |
| `collaboration.ts` | `subtasks`, `comments`, `comment_mentions`, `notifications` |
| `phase2.ts` | `attachments`, `custom_fields`, `task_custom_field_values`, `task_dependencies`, `time_entries` |

Migrations atuais: `0000_extensions.sql` (citext, pgcrypto) e `0001_initial_schema.sql` (todas as tabelas).
O teste `schema.spec.ts` falha se uma tabela sumir, se uma coluna fugir do snake_case ou se um enum divergir do shared.

## Ordenação no Kanban (`position`)

Usamos **posição fracionária**: ao soltar um cartão entre A (posição 1) e B (posição 2), o novo cartão fica em 1.5.
Assim, mover um cartão atualiza **uma linha só**. Quando a diferença entre duas posições ficar menor que `1e-6`, o
service renumera a coluna (1, 2, 3…). **A implementar** pela Pessoa 3, junto com a rota de mover, em
`modules/tasks/utils/position.ts`. Hoje as tarefas só entram no fim da coluna.

## Fluxo de migrations

```bash
# 1. Edite/crie o arquivo em apps/api/src/core/database/schema/
# 2. Gere a migration
pnpm --filter api db:generate --name add_comments
# 3. LEIA o SQL gerado em src/core/database/migrations/ (veja se não há DROP inesperado)
# 4. Aplique
pnpm --filter api db:migrate
# 5. Rode os testes (o banco de teste aplica as migrations sozinho)
pnpm --filter api test:e2e
```

**Regras:**
- **Nunca** edite uma migration que já está na `main`. Crie outra.
- **Nunca** use `drizzle-kit push` em ambiente compartilhado: só no seu banco local, se quiser experimentar.
- Duas pessoas geraram migration ao mesmo tempo e deu conflito? Quem fizer merge depois apaga a **sua** migration,
  atualiza a branch e gera de novo.
- Renomear coluna: o drizzle-kit pergunta se é rename ou drop+add. **Escolha rename.**

## Seed (dados de exemplo)

`pnpm --filter api db:seed` cria:
- usuários `ana@clickunicap.dev`, `bruno@clickunicap.dev` e `carla@clickunicap.dev` (senha `senha123`);
- um workspace "UNICAP Demo" com os três;
- 2 projetos com ~30 tarefas em status variados.

O seed fica em `apps/api/src/core/database/seed.ts` e não faz nada se os dados já existirem. Cada frente adiciona seus dados a ele.

`pnpm --filter api db:seed:demo` acrescenta dados fictícios mais próximos do uso real: 11 pessoas (mesma senha do seed),
3 workspaces, 8 projetos (um arquivado), convites pendentes e tarefas com prazos calculados a partir do dia em que roda.
Ana é dona do primeiro workspace e membro dos outros dois, para ver as duas permissões. O script fica em
`seed-demo.ts`, só acrescenta e não faz nada se já tiver rodado.

Para ter esses dados na sua própria conta, crie a conta pelo app e passe o e-mail:
`pnpm --filter api db:seed:demo seu@email.com`. Ela recebe os workspaces no lugar da Ana.

## Acesso ao banco em dev

- Adminer: http://localhost:8080 (sistema PostgreSQL, servidor `postgres`, usuário e senha do `.env`).
- Ou: `pnpm --filter api db:studio` (Drizzle Studio).
