# 04 — Guia do backend (NestJS + Drizzle)

Este guia ensina **como escrever código no `apps/api`**: onde cada coisa fica, as camadas, e como criar um módulo
novo do zero. Se você só ler uma seção, leia [Criando um módulo passo a passo](#criando-um-módulo-passo-a-passo).

## Estrutura de pastas

```
apps/api/
├── src/
│   ├── main.ts                     # bootstrap: prefixo /api, cookies, Swagger, pipes globais
│   ├── app.module.ts               # importa core + todos os módulos de negócio
│   ├── core/                       # infraestrutura transversal (dono: Pessoa 1)
│   │   ├── config/                 # leitura e validação do .env (Zod)
│   │   ├── database/
│   │   │   ├── database.module.ts  # provider DRIZZLE (global)
│   │   │   ├── schema/             # schemas Drizzle, um arquivo por domínio
│   │   │   │   ├── index.ts        # reexporta todos
│   │   │   │   ├── users.ts
│   │   │   │   ├── workspaces.ts
│   │   │   │   └── tasks.ts ...
│   │   │   └── migrations/         # geradas pelo drizzle-kit (NÃO editar à mão)
│   │   ├── auth/                   # JwtAuthGuard, @CurrentUser(), @Public()
│   │   ├── guards/                 # WorkspaceMemberGuard, RolesGuard
│   │   ├── pipes/                  # ZodValidationPipe
│   │   ├── filters/                # AllExceptionsFilter (formato de erro padrão)
│   │   ├── errors/                 # DomainError, NotFoundError, ForbiddenError ...
│   │   └── events/                 # nomes e payloads dos eventos de domínio
│   └── modules/                    # um módulo por domínio (cada um tem dono)
│       ├── auth/
│       ├── users/
│       ├── workspaces/
│       ├── projects/
│       ├── tasks/
│       ├── subtasks/
│       ├── comments/
│       ├── notifications/
│       └── ...
├── test/                           # testes e2e (Supertest + banco de teste)
│   ├── global-setup.ts             # aponta para o banco de teste e aplica as migrations
│   ├── utils/                      # create-test-app, auth-helpers e factories
│   └── projects-tasks.e2e-spec.ts
├── drizzle.config.ts
└── package.json
```

## Anatomia de um módulo

```
modules/tasks/
├── tasks.module.ts             # declara controller e providers; exporta SÓ o que outros podem usar
├── tasks.controller.ts         # HTTP: rotas, guards, pega params, chama o service. SEM regra de negócio
├── tasks.controller.spec.ts
├── tasks.service.ts            # REGRA DE NEGÓCIO: permissões, validações de domínio, eventos
├── tasks.service.spec.ts       # ← o teste mais importante do módulo
├── tasks.repository.ts         # SQL via Drizzle. SEM regra de negócio
├── tasks.repository.spec.ts    # (opcional) teste de integração com banco de teste
├── dto/                        # reexporta ou estende schemas do @clickunicap/shared
│   └── index.ts
├── events/                     # eventos que ESTE módulo emite
│   └── task-assigned.event.ts
└── tasks.mapper.ts             # (opcional) linha do banco → resposta da API
```

### O que vai em cada camada

| Camada | Faz | Não faz |
|---|---|---|
| **Controller** | Define rota e verbo; aplica guards; valida o body com o pipe; chama **um** método do service; devolve o resultado | Regra de negócio, acesso a banco, `try/catch` genérico |
| **Service** | Regras de negócio, checagem de permissão fina, orquestra repositories, abre transação, emite eventos | Saber de HTTP (`Request`, `Response`, status code), escrever SQL |
| **Repository** | Queries Drizzle, sempre com escopo de workspace; devolve objetos tipados | Decidir se pode ou não pode; lançar erro HTTP |
| **Mapper** | Converter linha do banco em DTO de resposta (esconde campos internos, ex.: `passwordHash`) | Lógica |

**Regra de bolso:** se você precisaria do código num job agendado (sem HTTP), ele vai no service. Se ele é SQL, vai
no repository.

## Criando um módulo passo a passo

Exemplo: o módulo `comments` (Pessoa 4).

### 1. Contrato em `packages/shared`

```ts
// packages/shared/src/schemas/comment.schema.ts
import { z } from 'zod';

export const commentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  authorId: z.string().uuid(),
  body: z.string().min(1).max(5000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createCommentSchema = commentSchema.pick({ body: true });
export const updateCommentSchema = createCommentSchema;

export type Comment = z.infer<typeof commentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
```

E exportar em `packages/shared/src/index.ts`.

### 2. Tabela Drizzle

```ts
// apps/api/src/core/database/schema/comments.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tasks } from './tasks';
import { users } from './users';

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull().references(() => users.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index('comments_task_id_idx').on(t.taskId)],
);
```

Depois: `pnpm --filter api db:generate`, revisar o SQL gerado e rodar `pnpm --filter api db:migrate`.
Ver [06 — Banco de dados](06-banco-de-dados.md).

### 3. Repository

```ts
// modules/comments/comments.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { comments, tasks, projects } from '@/core/database/schema';

@Injectable()
export class CommentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Lista comentários de uma tarefa, garantindo que ela pertence ao workspace. */
  async listByTask(workspaceId: string, taskId: string) {
    return this.db
      .select({ comment: comments })
      .from(comments)
      .innerJoin(tasks, eq(tasks.id, comments.taskId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(eq(comments.taskId, taskId), eq(projects.workspaceId, workspaceId)))
      .orderBy(asc(comments.createdAt))
      .then((rows) => rows.map((r) => r.comment));
  }

  async insert(data: typeof comments.$inferInsert) {
    const [row] = await this.db.insert(comments).values(data).returning();
    return row;
  }
}
```

### 4. Service (a regra de negócio, com teste)

```ts
// modules/comments/comments.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CreateCommentInput } from '@clickunicap/shared';
import { NotFoundError } from '@/core/errors';
import { DomainEvents } from '@/core/events';
import { TasksService } from '@/modules/tasks/tasks.service';
import { CommentsRepository } from './comments.repository';
import { extractMentions } from './utils/extract-mentions';

@Injectable()
export class CommentsService {
  constructor(
    private readonly repo: CommentsRepository,
    private readonly tasks: TasksService, // exportado pelo TasksModule
    private readonly events: EventEmitter2,
  ) {}

  async list(workspaceId: string, taskId: string) {
    return this.repo.listByTask(workspaceId, taskId);
  }

  async create(ctx: { userId: string; workspaceId: string }, taskId: string, input: CreateCommentInput) {
    const task = await this.tasks.findOne(ctx.workspaceId, taskId);
    if (!task) throw new NotFoundError('Task', taskId);

    const comment = await this.repo.insert({ taskId, authorId: ctx.userId, body: input.body });

    for (const mentionedUserId of extractMentions(input.body)) {
      this.events.emit(DomainEvents.CommentMentioned, { commentId: comment.id, taskId, mentionedUserId, by: ctx.userId });
    }
    return comment;
  }
}
```

### 5. Controller

```ts
// modules/comments/comments.controller.ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createCommentSchema, type CreateCommentInput } from '@clickunicap/shared';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { WorkspaceMemberGuard, CurrentWorkspace } from '@/core/guards';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';
import { CommentsService } from './comments.service';

@ApiTags('comments')
@UseGuards(WorkspaceMemberGuard)
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get()
  list(@CurrentWorkspace() workspaceId: string, @Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.service.list(workspaceId, taskId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentInput,
  ) {
    return this.service.create({ userId: user.id, workspaceId }, taskId, body);
  }
}
```

### 6. Module

```ts
// modules/comments/comments.module.ts
@Module({
  imports: [TasksModule],             // para usar o TasksService exportado
  controllers: [CommentsController],
  providers: [CommentsService, CommentsRepository],
  exports: [CommentsService],         // só o service, NUNCA o repository
})
export class CommentsModule {}
```

E registrar em `app.module.ts`.

### 7. Testes (no mesmo PR)

- `comments.service.spec.ts`: regra de negócio com o repository mockado.
- `utils/extract-mentions.spec.ts`: função pura.
- `test/comments.e2e-spec.ts`: rota real contra o banco de teste, incluindo o caso de **outro workspace → 404**.

Ver [07 — Testes](07-testes.md).

## Provider do banco

```ts
// core/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { AppConfig } from '@/core/config';

export const DRIZZLE = Symbol('DRIZZLE');
export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [AppConfig],
      useFactory: (config: AppConfig): Database =>
        drizzle(new Pool({ connectionString: config.databaseUrl }), { schema, casing: 'snake_case' }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
```

## Transações

Quando uma operação grava em **mais de uma tabela** (ex.: criar workspace + adicionar o criador como admin), use uma
transação. **Padrão atual:** o próprio repository expõe um método que faz tudo dentro de `this.db.transaction(...)`
(veja `WorkspacesRepository.createWithOwner` e `acceptInvite`). Se surgir uma transação que atravesse vários
repositories, adotaremos `@nestjs-cls/transactional` (exemplo abaixo) via ADR.

```ts
@Transactional()
async createWorkspace(userId: string, input: CreateWorkspaceInput) {
  const ws = await this.workspaces.insert({ name: input.name, ownerId: userId });
  await this.members.insert({ workspaceId: ws.id, userId, role: 'admin' });
  return ws;
}
```

Nos repositories, use `this.txHost.tx` no lugar de `this.db` (o `txHost` é injetado pelo `TransactionHost`).

## Validação

- **Body e query:** sempre `ZodValidationPipe(schema)` com um schema do `@clickunicap/shared`. Não use `class-validator`. Um projeto, um jeito. O pipe também recusa com 422 qualquer texto com caractere nulo (`\u0000`), que o Postgres não aceita.
- **Params de ID:** `ParseUUIDPipe`.
- **Regras de domínio** (ex.: "prazo não pode ser antes do início", "não pode haver dependência circular") ficam **no service** e lançam `DomainError`.

## Erros

Lance erros de domínio no service. O `AllExceptionsFilter` converte para HTTP:

| Classe (`core/errors`) | HTTP | `error` |
|---|---|---|
| `ValidationError` / ZodError | 422 | `VALIDATION_ERROR` |
| `UnauthenticatedError` | 401 | `UNAUTHENTICATED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `DomainError` (genérico) | 400 | código específico, ex.: `CIRCULAR_DEPENDENCY` |
| qualquer outra coisa | 500 | `INTERNAL_ERROR` (detalhe só no log) |

Nunca lance `HttpException` dentro de service. Nunca devolva stack trace para o cliente.

## Autenticação e autorização

- **`JwtAuthGuard` é global.** Toda rota exige login. Rotas abertas usam `@Public()` (login, cadastro, health).
- `@CurrentUser()` devolve `{ id, email }` do token.
- **`WorkspaceMemberGuard`** lê o workspace do header `X-Workspace-Id` (o frontend sempre envia o workspace ativo),
  confere a participação e injeta o workspace via `@CurrentWorkspace()`.
- **`@Roles('admin')`** + `RolesGuard` para ações de admin (convidar, remover membro, criar campo personalizado).
- **Permissão fina** (ex.: "só o autor edita o comentário") fica **no service**, porque é regra de negócio.

### Usando os guards de workspace (já implementados)

```ts
@Controller('projects')
@UseGuards(WorkspaceMemberGuard)               // membro do workspace do header X-Workspace-Id, senão 404
export class ProjectsController {
  @Get()
  list(@CurrentWorkspace() workspaceId: string) { ... }

  @Delete(':id')
  @UseGuards(WorkspaceMemberGuard, RolesGuard) // a ordem importa: primeiro descobre o papel, depois confere
  @Roles('admin')
  remove(@CurrentMembership() ws: WorkspaceContext) { ... }  // ws = { id, role }
}
```

- O workspace vem do parâmetro `:workspaceId` da rota ou, se não houver, do header **`X-Workspace-Id`**.
- Para validar que um usuário (ex.: o responsável de uma tarefa) é do workspace, use `WorkspacesService.isMember()`.
- Em testes e2e, use `registerUser(app)` e `registerUserWithWorkspace(app)` de `test/utils/auth-helpers.ts`.

### Rotas de projetos e tarefas (já implementadas)

Todas pedem o header `X-Workspace-Id`.

| Rota | O que faz |
|---|---|
| `POST /api/projects` · `GET /api/projects?includeArchived=true` | Cria / lista. Arquivados só aparecem com o parâmetro |
| `GET` · `PATCH /api/projects/:id` | Ver / editar |
| `POST /api/projects/:id/archive` · `/unarchive` | Só admin. Projetos não são apagados. Arquivado é **somente leitura** para as tarefas |
| `POST /api/projects/:projectId/tasks` | Cria no fim da coluna. Recusa projeto arquivado (`409 PROJECT_ARCHIVED`) |
| `GET /api/projects/:projectId/tasks` | Filtros: `status`, `priority`, `assigneeId`, `dueFrom`, `dueTo`, `search` |
| `GET /api/tasks/my` | Lista tarefas atribuídas ao usuário autenticado em todos os projetos do workspace ativo; aceita os mesmos filtros da listagem por projeto (o responsável é sempre o usuário autenticado) |
| `GET` · `PATCH` · `DELETE /api/tasks/:id` | Mudar o status leva ao fim da nova coluna e ajusta `completedAt`. `PATCH` e `DELETE` recusam projeto arquivado (`409 PROJECT_ARCHIVED`) |
| `POST /api/tasks/:id/move` | Kanban: muda coluna (status) e posição. Body `{ status, beforeTaskId, afterTaskId }` (vizinhos, `null` = ponta/fim). Recusa projeto arquivado (`409`) e vizinho desatualizado (`409 POSITION_CHANGED`). Ver [06 — Ordenação no Kanban](06-banco-de-dados.md#ordenação-no-kanban-position) |

Quem escrever em tarefas (ex.: a rota de mover da Pessoa 3) segue a mesma regra de projeto arquivado.
Outros módulos usam `TasksService.findOne(workspaceId, taskId)`, que devolve `null` fora do workspace.
Eventos já emitidos: `task.assigned`, `task.status_changed` e `comment.mentioned`. O módulo `notifications` ouve `task.assigned` e `comment.mentioned`.
`task.due_soon` está no catálogo, mas nada o emite ainda: depende de um agendador, a combinar com a Pessoa 5.
Para o Swagger, use `@ZodBody(schema)` no body e `@ZodResponse(schema)` na resposta (`core/swagger/zod-body.ts`).
Em testes e2e, use `createProject` e `createTask` de `test/utils/factories.ts`.

### Rotas de subtarefas (já implementadas)

Todas pedem o header `X-Workspace-Id`.

| Rota | O que faz |
|---|---|
| `GET /api/tasks/:taskId/subtasks` | Lista em ordem de posição. Continua funcionando em projeto arquivado |
| `POST /api/tasks/:taskId/subtasks` | Cria no fim da lista. Body `{ title }` |
| `PATCH /api/subtasks/:id` | Edita `title` e/ou `isDone`. Body vazio devolve `422` |
| `DELETE /api/subtasks/:id` | Remove (204) |

Projeto arquivado é somente leitura: criar, editar e apagar devolvem `409 PROJECT_ARCHIVED`. Apagar a tarefa apaga as
subtarefas (cascade). Tarefa ou subtarefa de outro workspace devolve `404`.

### Rotas de comentários (já implementadas)

Todas pedem o header `X-Workspace-Id`.

| Rota | O que faz |
|---|---|
| `GET /api/tasks/:taskId/comments` | Lista os comentários da tarefa |
| `POST /api/tasks/:taskId/comments` | Cria. Body `{ body }` |
| `PATCH /api/comments/:id` | Só o autor (`403` para outros). Body `{ body }` |
| `DELETE /api/comments/:id` | Só o autor (`403` para outros). 204 |

Menção no formato `@[userId]`, gravada em `comment_mentions`. Só vale para membros do workspace; quem não é membro é
ignorado. Cada pessoa mencionada gera o evento `comment.mentioned` (com `workspaceId` no payload), exceto o próprio autor.
Na edição, só as menções novas geram evento. Projeto arquivado é somente leitura (`409 PROJECT_ARCHIVED`, checado antes da autoria). Tarefa ou comentário de outro
workspace devolve `404`.

### Rotas de dependências (já implementadas)

Módulo `dependencies` (Pessoa 9). Todas pedem o header `X-Workspace-Id`. "A depende de B" = A fica esperando B terminar.

| Rota | O que faz |
|---|---|
| `GET /api/tasks/:taskId/dependencies` | `{ blockedBy, blocking }`: as tarefas que esta espera e as que esperam por ela, com título, status e datas |
| `POST /api/tasks/:taskId/dependencies` | Body `{ dependsOnTaskId }`. A tarefa passa a esperar a outra. Erros: `SELF_DEPENDENCY` (400), `DEPENDENCY_OTHER_PROJECT` (400, as duas precisam estar no mesmo projeto), `CIRCULAR_DEPENDENCY` (400), `DEPENDENCY_EXISTS` (409), `PROJECT_ARCHIVED` (409) |
| `DELETE /api/tasks/:taskId/dependencies/:dependsOnTaskId` | Remove (204). Recusa projeto arquivado (409) |
| `GET /api/projects/:projectId/dependencies` | Todas as dependências do projeto (pares `taskId` → `dependsOnTaskId`), para as setas do Gantt |

A regra de ciclo é a função pura `wouldCreateCycle` (`modules/dependencies/utils/cycle.ts`). A gravação roda numa
transação que trava o projeto, para que duas pessoas não fechem um ciclo ao mesmo tempo. Excluir uma tarefa apaga as
dependências dela (`on delete cascade`). As dependências não impedem concluir uma tarefa: o detalhe da tarefa avisa
quando ela está bloqueada e o Gantt avisa quando as datas entram em conflito.

### Rotas de campos personalizados (já implementadas)

Módulo `custom-fields` (Pessoa 8). Todas as rotas exigem o header `X-Workspace-Id`.

| Rota | Quem pode / O que faz |
|---|---|
| `GET /api/projects/:projectId/custom-fields` | Membros do workspace. Lista os campos do projeto, ordenados por posição |
| `POST /api/projects/:projectId/custom-fields` | Administradores. Cria campo com nome, tipo, opções de dropdown e obrigatoriedade |
| `PATCH /api/custom-fields/:fieldId` | Administradores. Atualiza nome, opções, obrigatoriedade ou posição |
| `DELETE /api/custom-fields/:fieldId` | Administradores. Exclui o campo e seus valores associados |
| `GET /api/projects/:projectId/custom-field-values` | Membros do workspace. Valores de todas as tarefas do projeto numa chamada, `{ taskId: { fieldId: value } }` (tarefa sem valor não aparece). Usado pelas colunas da Lista |
| `GET /api/tasks/:taskId/custom-field-values` | Membros do workspace. Lista os valores personalizados da tarefa |
| `PATCH /api/tasks/:taskId/custom-field-values` | Membros do workspace. Salva valores no body `{ values: { fieldId: value } }` |

Tipos disponíveis: `text`, `number`, `date`, `dropdown` e `checkbox`. O dropdown exige opções cadastradas. Os valores são validados conforme o tipo e campos obrigatórios não aceitam valores vazios ou nulos. O tipo de um campo não pode ser alterado depois da criação.

**Campo obrigatório: até onde vale.** A obrigatoriedade é conferida **só ao gravar valores** (`PATCH .../custom-field-values`),
e só para os campos enviados no body: o frontend manda apenas os campos alterados. Criar uma tarefa
(`POST /projects/:projectId/tasks`, módulo `tasks`) não exige os campos obrigatórios, e marcar `isRequired` num campo
que já existe não revalida as tarefas antigas: elas continuam sem valor até alguém editar aquele campo.
Checkbox obrigatório só aceita `true` ("precisa estar marcado", como um aceite); `false` e `null` dão `REQUIRED_FIELD`.

O nome é único por projeto, sem diferenciar maiúsculas. A checagem e a gravação (criar e renomear) rodam numa transação
que trava a linha do projeto (`SELECT ... FOR UPDATE`, igual a `dependencies`), para duas requisições simultâneas não
criarem nomes repetidos. Não há constraint no banco para isso.

Erros de domínio relevantes: `CUSTOM_FIELD_NAME_EXISTS` (409), `OPTION_IN_USE` (409), `PROJECT_ARCHIVED` (409), `REQUIRED_FIELD` (400) e `INVALID_FIELD_VALUE` (400). Projetos arquivados permitem leitura, mas não criação, edição, exclusão ou gravação de valores. Acesso a projeto, campo ou tarefa de outro workspace resulta em 404.

### Rotas de notificações (já implementadas)

Módulo `notifications` (Pessoa 5). Todas pedem o header `X-Workspace-Id` e mostram só a caixa de entrada do usuário
logado naquele workspace: a notificação de outra pessoa ou de outro workspace responde 404.

| Rota | O que faz |
|---|---|
| `GET /api/notifications?unread=true&limit=20&cursor=<id>` | As mais novas primeiro. Resposta `{ data, nextCursor }`: para a próxima página, mande o `nextCursor` como `cursor` (`null` = acabou) |
| `GET /api/notifications/unread-count` | `{ count }`, o número do sino |
| `POST /api/notifications/:id/read` | Marca como lida e devolve a notificação. Marcar de novo mantém a data original |
| `POST /api/notifications/read-all` | Marca todas como lidas (204) |

As notificações nascem de eventos, no `NotificationsListener`: `task.assigned` → `task_assigned`,
`comment.mentioned` → `comment_mentioned` e `task.due_soon` → `task_due_soon`. Ninguém é notificado pelo que fez a si
mesmo, e uma falha no ouvinte vai para o log sem afetar a ação de quem emitiu o evento. O `payload` guarda o título da
tarefa, o projeto e o nome de quem causou (`null` nos avisos automáticos), para a tela não precisar buscar a tarefa.
`refId` aponta para a tarefa, ou para o comentário nas menções.

### Rotas de controle de tempo (já implementadas)

Módulo `time-tracking` (Pessoa 10). Todas pedem o header `X-Workspace-Id`. Tarefa ou lançamento de outro workspace
responde 404, e projeto de outro workspace também.

| Rota | O que faz |
|---|---|
| `GET /api/tasks/:taskId/time-entries` | `{ entries, totalMinutes }`: as entradas (mais recentes pelo início), com o nome de quem lançou. O total soma só as paradas |
| `POST /api/tasks/:taskId/time-entries/start` | Inicia o timer do usuário na tarefa (201). Resposta `{ timer, stopped }`: se havia um timer ativo em outra tarefa deste workspace, ele é parado e vem em `stopped`. Na tarefa que já conta, devolve o mesmo timer. Timer ativo em outro workspace: `TIMER_RUNNING_ELSEWHERE` (409) |
| `GET /api/time-entries/current` | `{ timer }`: o timer ativo do usuário neste workspace, com `taskTitle`, ou `null` |
| `POST /api/time-entries/current/stop` | Para o timer ativo e grava os minutos (200). Sem timer: 404 |
| `POST /api/tasks/:taskId/time-entries` | Lançamento manual `{ minutes, startedAt?, note? }` (201). Sem `startedAt`, termina agora. Terminar no futuro: `TIME_ENTRY_IN_FUTURE` (400) |
| `PATCH /api/time-entries/:id` | Muda `minutes` e/ou `note`. Os minutos mantêm o fim e recalculam o início. Timer ativo: `TIMER_RUNNING` (409) |
| `DELETE /api/time-entries/:id` | Exclui (204) |
| `GET /api/projects/:projectId/time-report?from&to` | Relatório de horas: `{ from, to, totalMinutes, byMember, byTask }`, com o tempo já parado do projeto que começou em `[from, to)`. As listas vêm do maior para o menor. `from` e `to` em ISO, com no máximo 366 dias (senão 422). Qualquer membro vê, inclusive em projeto arquivado |

Regras: cada usuário tem **1 timer ativo**, em qualquer workspace (índice único parcial em `time_entries`). Iniciar
outro para o anterior na mesma transação, que trava o timer ativo. Dois inícios ao mesmo tempo terminam com 1 timer
contando e o outro parado: quem perde a corrida tenta de novo uma vez, e se perder de novo recebe
`TIMER_ALREADY_RUNNING` (409). Um timer de outro workspace **não** é parado daqui, porque isso mexeria em dados de outro
workspace. A resposta só diz que ele existe, sem mostrar a tarefa. Os minutos são inteiros, arredondados para baixo
(`utils/duration.ts`), e um lançamento manual vai de 1 min a 24 h. Editar e excluir: o autor ou um admin do workspace
(senão 403). Projeto arquivado é somente leitura (`PROJECT_ARCHIVED`, 409), mas o timer ativo ainda pode ser parado,
também pela troca automática. Excluir a tarefa apaga o tempo dela, inclusive o timer ativo. No relatório, o timer que
ainda conta fica de fora, e cada entrada conta inteira no período em que começou (não é cortada no limite). A tela
manda o período já convertido do fuso de quem usa (início do primeiro dia e início do dia seguinte ao último); por
causa do horário de verão, o limite de 366 dias tem 1 hora de folga. O export CSV é gerado na tela a partir desta
resposta, sem rota própria.

### Rotas de workspaces (já implementadas)

| Rota | Quem pode |
|---|---|
| `POST /api/workspaces` · `GET /api/workspaces` | Qualquer usuário logado (cria / lista os seus, com `myRole`) |
| `GET /api/workspaces/:id` · `GET /:id/members` | Membros |
| `PATCH /api/workspaces/:id` | Admin |
| `DELETE /api/workspaces/:id` | Só o **dono** |
| `PATCH /:id/members/:userId` (papel) | Admin. O papel do dono não muda; sempre resta 1 admin |
| `DELETE /:id/members/:userId` | Admin remove outros; qualquer membro remove a si mesmo (sair). O dono não sai. As tarefas da pessoa neste workspace ficam sem responsável |
| `POST /:id/invites` · `GET /:id/invites` · `DELETE /:id/invites/:inviteId` | Admin. Convite por e-mail, vale 7 dias |
| `POST /api/invites/accept` `{ token }` | O usuário logado com o **mesmo e-mail** do convite |

### Rotas de autenticação (já implementadas)

| Rota | O que faz |
|---|---|
| `POST /api/auth/register` | Cria a conta e já abre a sessão (201 `{ user }` + cookies) |
| `POST /api/auth/login` | 200 `{ user }` + cookies. Erro sempre "E-mail ou senha inválidos" |
| `POST /api/auth/refresh` | Troca o refresh token por um novo (**rotação**). Reusar um token antigo encerra todas as sessões. Até 10 s depois da troca, o reuso recebe `409 REFRESH_IN_PROGRESS` sem mexer nos cookies (várias abas): o frontend deve só repetir a requisição original |
| `POST /api/auth/logout` | Revoga a sessão e apaga os cookies (204) |
| `POST /api/auth/forgot-password` | Sempre 204; se o e-mail existe, envia o link (em dev, aparece no log da API) |
| `POST /api/auth/reset-password` | Troca a senha com o token do link (vale 1 h, uso único), invalida os outros links pendentes e derruba as sessões |
| `GET/PATCH /api/users/me` | Perfil do usuário logado |

**Limite de tentativas (por IP, por minuto):** login 5, cadastro 5, recuperar senha 3, redefinir senha 5, demais
rotas de auth 20. Ao estourar: `429 TOO_MANY_REQUESTS`. Desligado nos testes.

**E-mail:** `core/mail` escolhe o transporte pelo `.env`: `log` em dev ou `resend` para envio real
(configuração em [10 — Ambiente local](10-ambiente-local.md#e-mail-com-resend)). Para um e-mail novo, crie um template
em `core/mail/templates/` (texto + HTML, escapando dados do usuário com `escapeHtml`) e chame `MailService.send()`.

Cookies: `access_token` (path `/api`, 15 min) e `refresh_token` (path `/api/auth`, 7 dias), ambos httpOnly e
SameSite=Lax (Secure em produção). Ferramentas como Insomnia podem mandar `Authorization: Bearer <access_token>`.

| Rota | Guard / decorator |
|---|---|
| `POST /api/auth/login` | `@Public()` |
| `GET /api/projects` | global + `WorkspaceMemberGuard` |
| `POST /api/workspaces/:id/invites` | global + `WorkspaceMemberGuard` + `@Roles('admin')` |

## Eventos de domínio

Módulos se comunicam por **eventos** (`@nestjs/event-emitter`) quando um não precisa da resposta do outro.

```ts
// core/events/index.ts — catálogo único de eventos (adicione aqui, com o payload tipado)
export const DomainEvents = {
  TaskAssigned: 'task.assigned',
  TaskStatusChanged: 'task.status_changed',
  TaskDueSoon: 'task.due_soon',
  CommentMentioned: 'comment.mentioned',
} as const;

export interface TaskAssignedPayload { taskId: string; assigneeId: string; by: string; workspaceId: string }
export interface CommentMentionedPayload { commentId: string; taskId: string; mentionedUserId: string; by: string }
```

```ts
// modules/notifications/notifications.listener.ts
@Injectable()
export class NotificationsListener {
  constructor(private readonly service: NotificationsService) {}

  @OnEvent(DomainEvents.TaskAssigned, { async: true })
  onTaskAssigned(p: TaskAssignedPayload) {
    if (p.assigneeId === p.by) return; // não notificar a si mesmo
    return this.service.create({ userId: p.assigneeId, type: 'task_assigned', refId: p.taskId });
  }
}
```

**Quando usar evento e quando chamar o service exportado:**
- Precisa da resposta ou de garantia de que deu certo antes de continuar? **Chame o service** (ex.: comentários precisam saber se a tarefa existe).
- É um efeito colateral ("avise", "registre", "recalcule")? **Emita um evento.**

## Configuração

`core/config` lê o `.env` e **valida com Zod na subida**. Se faltar variável, a API não sobe e diz qual falta.
Nunca use `process.env.X` fora do `core/config`.

## Swagger

Toda rota aparece em `/api/docs`. Use `@ZodBody(schema)` no body e `@ZodResponse(schema)` na resposta, para gerar a
documentação a partir do mesmo schema do `shared`. O teste `test/swagger.e2e-spec.ts` falha se uma rota com corpo ficar
sem o formato da resposta.

## Checklist do PR de backend

- [ ] Controller sem regra de negócio; service sem `Request`/`Response`; repository sem regra.
- [ ] Toda query filtra por `workspaceId`.
- [ ] Body validado com schema do `@clickunicap/shared`.
- [ ] Erros com as classes de `core/errors`.
- [ ] Teste unitário do service e teste e2e da rota (incluindo o caso de outro workspace).
- [ ] Migration gerada e revisada, se mudou o schema.
- [ ] Rota aparece no Swagger.
- [ ] Nenhum `any`, nenhum `console.log`, nenhum `process.env` fora do config.
