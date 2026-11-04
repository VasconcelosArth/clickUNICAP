# 05 — Guia do frontend (React + Vite)

Este guia ensina **como escrever código no `apps/web`**. A arquitetura segue o padrão **por feature**, inspirado no
Bulletproof React: cada funcionalidade é uma pasta autocontida, e o código compartilhado fica fora das features.

## Estrutura de pastas

```
apps/web/src/
├── main.tsx
├── app/                        # "cola" da aplicação (dono: Pessoa 1)
│   ├── providers.tsx           # QueryClientProvider, Router, Theme, Toaster
│   ├── router.tsx              # todas as rotas; carrega as páginas das features com lazy()
│   ├── layouts/
│   │   ├── AppLayout.tsx       # menu lateral + topo + <Outlet/>
│   │   └── AuthLayout.tsx
│   └── slots/                  # registro de slots (ver abaixo)
├── components/
│   └── ui/                     # design system: Button, Input, Modal, Select, Avatar, Badge...
├── features/                   # uma pasta por funcionalidade (cada uma tem dono)
│   ├── auth/
│   ├── workspaces/
│   ├── projects/
│   ├── tasks/                  # núcleo + tela de detalhe com slots (Pessoa 1)
│   ├── task-list/              # Pessoa 2
│   ├── kanban/                 # Pessoa 3
│   ├── subtasks/  comments/    # Pessoa 4
│   ├── notifications/          # Pessoa 5
│   └── calendar/ attachments/ custom-fields/ dependencies/ gantt/ time-tracking/
├── lib/
│   ├── api-client.ts           # fetch configurado (baseURL, cookies, X-Workspace-Id, erros)
│   ├── query-client.ts
│   └── utils.ts                # cn(), formatDate()...
├── hooks/                      # hooks genéricos (useDebounce, useDisclosure)
├── stores/                     # Zustand: só estado de UI global (ex.: workspace ativo, sidebar aberta)
├── mocks/                      # MSW: browser.ts, server.ts (testes), handlers.ts que junta os das features
└── test/                       # setup do Vitest, render com providers
```

## Anatomia de uma feature

```
features/comments/
├── api/
│   ├── comments.api.ts          # funções puras de chamada HTTP (sem React)
│   ├── comments.queries.ts      # hooks TanStack Query: useComments, useCreateComment
│   └── comments.keys.ts         # query keys da feature
├── components/
│   ├── CommentList.tsx
│   ├── CommentList.test.tsx     # ← teste ao lado do componente
│   ├── CommentForm.tsx
│   └── CommentForm.test.tsx
├── hooks/                       # hooks específicos da feature (opcional)
├── mocks/
│   └── comments.handlers.ts     # handlers MSW para trabalhar sem backend
├── pages/                       # telas inteiras (quando a feature tem rota)
├── utils/                       # funções puras + testes
└── index.ts                     # API PÚBLICA da feature: só o que o app/ pode usar
```

**Regras:**
1. **Features não importam umas das outras.** Se duas features precisam da mesma coisa, ela sobe para `components/ui`, `lib/` ou `hooks/`.
2. **Quem está fora da feature importa só do `index.ts`** dela (`import { CommentsSlot } from '@/features/comments'`).
3. **Tipos vêm do `@clickunicap/shared`.** Não declare `interface Task` no frontend.

## Dados do servidor: TanStack Query

Tudo que vem da API passa pelo TanStack Query. **Não use `useEffect` + `useState` para buscar dados.**

```ts
// features/comments/api/comments.keys.ts
export const commentKeys = {
  all: ['comments'] as const,
  byTask: (taskId: string) => [...commentKeys.all, 'task', taskId] as const,
};
```

```ts
// features/comments/api/comments.api.ts
import type { Comment, CreateCommentInput } from '@clickunicap/shared';
import { api } from '@/lib/api-client';

export const commentsApi = {
  list: (taskId: string) => api.get<Comment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: string, input: CreateCommentInput) => api.post<Comment>(`/tasks/${taskId}/comments`, input),
};
```

```ts
// features/comments/api/comments.queries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from './comments.api';
import { commentKeys } from './comments.keys';

export function useComments(taskId: string) {
  return useQuery({ queryKey: commentKeys.byTask(taskId), queryFn: () => commentsApi.list(taskId) });
}

export function useCreateComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => commentsApi.create(taskId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentKeys.byTask(taskId) }),
  });
}
```

### Chaves que várias features compartilham

Lista, Kanban, Calendário e Gantt mostram **as mesmas tarefas**. Todos usam as chaves de `features/tasks`
(exportadas em `features/tasks/index.ts` como `taskKeys`). Assim, mover um cartão no Kanban atualiza a Lista.

```ts
export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string, filters: TaskFilters) => [...taskKeys.all, 'list', projectId, filters] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
};
```

> Esta é a **única exceção** à regra "features não se importam": `taskKeys`, `useTasks` e `useUpdateTask` são a
> API pública do núcleo, e as views usam essa API.

### Atualização otimista (Kanban, checkbox de subtarefa)

Para interações que precisam parecer instantâneas, use `onMutate` para atualizar o cache, `onError` para
desfazer e `onSettled` para revalidar. Exemplo completo em `features/kanban/api/kanban.queries.ts` (Pessoa 3).

## Estado de UI

| Tipo de estado | Onde guardar |
|---|---|
| Dados da API | TanStack Query |
| Filtros, aba ativa, página | **URL** (`useSearchParams`), para ser compartilhável e sobreviver ao F5 |
| Estado de formulário | React Hook Form |
| Estado local de um componente (modal aberto) | `useState` |
| Estado global de UI (workspace ativo, sidebar) | Zustand em `stores/` |

## Formulários

React Hook Form + `zodResolver` com o **schema do shared**:

```tsx
const form = useForm<CreateCommentInput>({ resolver: zodResolver(createCommentSchema), defaultValues: { body: '' } });
```

As mensagens de erro de validação vêm do schema. Para traduzir, use o `errorMap` configurado em `packages/shared`.

## Cliente HTTP

`lib/api-client.ts` é o único lugar que chama `fetch`:
- `baseURL` = `import.meta.env.VITE_API_URL` (padrão `/api`, com proxy do Vite em dev);
- `credentials: 'include'` (os cookies de auth vão sozinhos);
- envia `X-Workspace-Id` com o workspace ativo do store;
- em **401**, tenta `POST /auth/refresh` uma vez e repete a requisição; se falhar de novo, manda para o `/login`;
- converte o erro padrão da API numa classe `ApiError { statusCode, error, message, details }`.

## Slots da tela de tarefa

A tela de detalhe da tarefa (`features/tasks`) tem regiões que outras features preenchem **sem editar o
arquivo da base**.

```ts
// app/slots/task-detail-slots.ts  (dono: Pessoa 1)
import type { ComponentType } from 'react';
export type TaskSlotProps = { taskId: string; projectId: string };
export type TaskSlotRegion = 'main' | 'activity' | 'sidebar' | 'attachments';

export interface TaskSlot { id: string; region: TaskSlotRegion; order: number; Component: ComponentType<TaskSlotProps> }
```

```ts
// app/slots/registry.ts  ← cada dono de feature adiciona UMA linha aqui
import { subtasksSlot } from '@/features/subtasks';
import { commentsSlot } from '@/features/comments';
export const taskSlots: TaskSlot[] = [subtasksSlot, commentsSlot /*, attachmentsSlot, timeTrackingSlot ... */];
```

```ts
// features/comments/index.ts
export const commentsSlot: TaskSlot = { id: 'comments', region: 'activity', order: 10, Component: CommentsPanel };
```

A `TaskDetailPage` renderiza, em cada região, os slots daquela região ordenados por `order`.

## Trabalhando sem backend (MSW)

1. Crie `features/<feature>/mocks/<feature>.handlers.ts` com respostas usando dados que **passam no schema do shared**.
2. Adicione os handlers em `src/mocks/handlers.ts`.
3. `VITE_ENABLE_MOCKS=true pnpm --filter web dev` liga os mocks no navegador.
4. Os mesmos handlers são usados nos testes (Vitest), então o mock serve duas vezes.

## Componentes de UI

- `components/ui` é o design system. Antes de criar um botão, veja se já existe.
- Componentes de UI **não buscam dados** e **não conhecem features**: recebem props.
- Estilo com Tailwind; para juntar classes condicionais use `cn()` de `lib/utils`.
- **Acessibilidade obrigatória:** todo `input` tem `label`; botões só com ícone têm `aria-label`; modal prende o foco;
  o Kanban precisa funcionar no teclado (o `@dnd-kit` tem suporte).

## Rotas

```
/login  /register  /forgot-password
/w/:workspaceId                         → redireciona para o primeiro projeto
/w/:workspaceId/my-tasks                → Minhas tarefas (Pessoa 2)
/w/:workspaceId/p/:projectId/list       → Lista (Pessoa 2)
/w/:workspaceId/p/:projectId/board      → Kanban (Pessoa 3)
/w/:workspaceId/p/:projectId/calendar   → Calendário (Pessoa 6)
/w/:workspaceId/p/:projectId/gantt      → Gantt (Pessoa 9)
/w/:workspaceId/t/:taskId               → Detalhe da tarefa (abre como modal sobre a view atual)
/w/:workspaceId/settings/members        → Membros (Pessoa 1)
```

Cada página é carregada com `lazy()` para que uma feature pesada (Gantt) não deixe o app todo lento.

## Checklist do PR de frontend

- [ ] A feature não importa outra feature (exceto a API pública de `tasks`).
- [ ] Dados via TanStack Query; filtros na URL.
- [ ] Tipos e validação vindos do `@clickunicap/shared`.
- [ ] Estados de **loading, erro e vazio** tratados em toda tela.
- [ ] Teste de componente com Testing Library + MSW.
- [ ] Acessível no teclado; inputs com label.
- [ ] Nenhum `any`, nenhum `console.log`, nenhum token em `localStorage`.
