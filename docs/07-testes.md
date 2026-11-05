# 07 — Testes

**Regra do projeto: código novo só está pronto com teste escrito e passando, no mesmo PR.** O CI bloqueia o merge se
algum teste falhar. Este documento diz o que testar, onde colocar o teste e como rodar.

## A pirâmide do projeto

| Tipo | Ferramenta | Onde fica | Testa | Quantidade |
|---|---|---|---|---|
| Unitário (back) | Jest | ao lado do arquivo: `tasks.service.spec.ts` | Regras do service e funções puras, com o repository mockado | Muitos |
| Integração/e2e (back) | Jest + Supertest + Postgres de teste | `apps/api/test/*.e2e-spec.ts` | A rota de verdade: guard, validação, SQL, resposta | Um ou mais por rota |
| Componente (front) | Vitest + Testing Library + MSW | ao lado: `CommentForm.test.tsx` | O que o usuário vê e faz na tela | Um por componente com lógica |
| Unitário (front/shared) | Vitest | ao lado: `position.test.ts` | Funções puras, schemas Zod | Muitos |
| Ponta a ponta | Playwright | `e2e/` na raiz | Fluxos críticos no navegador | Poucos (5 a 10) |

## Como escrever teste junto com a função

Fluxo sugerido para **toda** função nova:

1. Escreva a assinatura da função e o **nome dos testes** primeiro (o que ela deve fazer e o que não deve).
2. Implemente.
3. Preencha os testes: caminho feliz, **casos de borda** e **erros**.
4. Rode só o seu teste em modo watch: `pnpm --filter api test -- comments.service --watch`.
5. Antes do PR, rode tudo: `pnpm test`.

### O que todo service precisa testar

- [ ] Caminho feliz.
- [ ] Recurso inexistente → `NotFoundError`.
- [ ] Usuário sem permissão → `ForbiddenError`.
- [ ] Cada regra de negócio (ex.: "só o autor edita", "sem dependência circular", "1 timer ativo").
- [ ] Eventos emitidos com o payload certo (e **não** emitidos quando não deveriam).

### O que toda rota precisa testar (e2e)

- [ ] 401 sem login.
- [ ] 422 com body inválido.
- [ ] **404 ao acessar dado de outro workspace** (teste de isolamento, obrigatório).
- [ ] O sucesso grava no banco o que deveria.

## Exemplos

### Unitário de service (Jest)

```ts
// modules/comments/comments.service.spec.ts
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';
import { TasksService } from '@/modules/tasks/tasks.service';
import { NotFoundError } from '@/core/errors';
import { DomainEvents } from '@/core/events';

describe('CommentsService', () => {
  let service: CommentsService;
  const repo = { insert: jest.fn(), listByTask: jest.fn() };
  const tasks = { findOne: jest.fn() };
  const events = { emit: jest.fn() };
  const ctx = { userId: 'u1', workspaceId: 'w1' };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentsRepository, useValue: repo },
        { provide: TasksService, useValue: tasks },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = mod.get(CommentsService);
  });

  it('cria o comentário quando a tarefa existe no workspace', async () => {
    tasks.findOne.mockResolvedValue({ id: 't1' });
    repo.insert.mockResolvedValue({ id: 'c1', body: 'oi' });

    await expect(service.create(ctx, 't1', { body: 'oi' })).resolves.toMatchObject({ id: 'c1' });
    expect(repo.insert).toHaveBeenCalledWith({ taskId: 't1', authorId: 'u1', body: 'oi' });
  });

  it('lança NotFoundError quando a tarefa não é do workspace', async () => {
    tasks.findOne.mockResolvedValue(null);
    await expect(service.create(ctx, 't1', { body: 'oi' })).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('emite um evento por pessoa mencionada', async () => {
    tasks.findOne.mockResolvedValue({ id: 't1' });
    repo.insert.mockResolvedValue({ id: 'c1' });
    await service.create(ctx, 't1', { body: 'oi @[u2] e @[u3]' });
    expect(events.emit).toHaveBeenCalledTimes(2);
    expect(events.emit).toHaveBeenCalledWith(DomainEvents.CommentMentioned, expect.objectContaining({ mentionedUserId: 'u2' }));
  });
});
```

### E2E de rota (Supertest + banco de teste)

```ts
// test/comments.e2e-spec.ts
describe('POST /api/tasks/:taskId/comments', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createTestApp(); });   // test/setup-e2e.ts
  beforeEach(async () => { await resetDatabase(); });       // TRUNCATE em todas as tabelas
  afterAll(async () => { await app.close(); });

  it('201 e grava o comentário', async () => {
    const { agent, workspace } = await loginAsNewUser(app);  // factory: cria usuário + workspace + cookie
    const task = await taskFactory.create({ workspaceId: workspace.id });

    const res = await agent.post(`/api/tasks/${task.id}/comments`)
      .set('X-Workspace-Id', workspace.id).send({ body: 'Olá' }).expect(201);

    expect(res.body).toMatchObject({ body: 'Olá', taskId: task.id });
  });

  it('404 quando a tarefa é de outro workspace', async () => {
    const { agent, workspace } = await loginAsNewUser(app);
    const alheia = await taskFactory.create();               // workspace de outra pessoa
    await agent.post(`/api/tasks/${alheia.id}/comments`)
      .set('X-Workspace-Id', workspace.id).send({ body: 'x' }).expect(404);
  });

  it('422 com body vazio', async () => {
    const { agent, workspace } = await loginAsNewUser(app);
    const task = await taskFactory.create({ workspaceId: workspace.id });
    await agent.post(`/api/tasks/${task.id}/comments`).set('X-Workspace-Id', workspace.id).send({ body: '' }).expect(422);
  });
});
```

Nomes reais dos helpers: `createTestApp` e `resetDatabase` (`test/utils/create-test-app.ts`), `registerUser` e `registerUserWithWorkspace` (`test/utils/auth-helpers.ts`), `createProject` e `createTask` (`test/utils/factories.ts`).

O banco de teste é o serviço `postgres-test` do Docker (porta **5433**, dados em memória com `tmpfs`). O
`setup-e2e.ts` aplica as migrations uma vez antes de tudo.

### Componente (Vitest + Testing Library + MSW)

```tsx
// features/comments/components/CommentForm.test.tsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';
import { CommentForm } from './CommentForm';

it('envia o comentário e limpa o campo', async () => {
  const user = userEvent.setup();
  renderWithProviders(<CommentForm taskId="t1" />);

  await user.type(screen.getByLabelText(/comentário/i), 'Feito!');
  await user.click(screen.getByRole('button', { name: /enviar/i }));

  expect(await screen.findByLabelText(/comentário/i)).toHaveValue('');
});

it('mostra o erro da API', async () => {
  server.use(http.post('*/tasks/:id/comments', () => HttpResponse.json({ message: 'Falhou' }, { status: 500 })));
  const user = userEvent.setup();
  renderWithProviders(<CommentForm taskId="t1" />);
  await user.type(screen.getByLabelText(/comentário/i), 'x');
  await user.click(screen.getByRole('button', { name: /enviar/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/falhou/i);
});
```

**Boas práticas de teste de componente:**
- Busque elementos como o usuário encontraria: `getByRole`, `getByLabelText`. Evite `getByTestId`.
- Teste **comportamento** (o que aparece, o que acontece ao clicar), não detalhes internos (state, nome de função).
- Não mocke o TanStack Query: mocke a **rede** com MSW.

### Ponta a ponta (Playwright): os fluxos obrigatórios

1. Cadastrar → criar workspace → criar projeto → criar tarefa.
2. Convidar membro → membro aceita → atribuir tarefa → membro vê a notificação.
3. Arrastar tarefa no Kanban → a Lista mostra o novo status.
4. Comentar com menção → mencionado recebe notificação.
5. Usuário A não consegue abrir a URL de uma tarefa do workspace de B.

## Comandos

```bash
pnpm test                         # tudo (shared + api unit + web)
pnpm --filter api test            # unitários do backend
pnpm --filter api test:e2e        # e2e do backend (precisa do postgres-test: docker compose up -d postgres-test)
pnpm --filter web test            # frontend
pnpm test:e2e                     # Playwright (sobe api + web)
pnpm test -- --coverage           # cobertura
```

## Metas de cobertura

| Pacote | Mínimo no CI |
|---|---|
| `packages/shared` | 90% |
| `apps/api` (services e utils) | 80% |
| `apps/web` (features) | 70% |

A cobertura é uma consequência, não o objetivo. Um teste que só executa a linha sem verificar nada não conta.

## Antes de commitar

Rode os testes **antes de todo commit** (o hook `pre-commit` do Husky roda os testes dos arquivos alterados).
Se falhar, **não commite**: corrija ou diga no grupo qual teste quebrou e por quê. Nunca use `--no-verify`.
