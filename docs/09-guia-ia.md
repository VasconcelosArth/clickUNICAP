# 09 — Guia para desenvolvimento com IA

Este guia é para quem usa Claude Code, Cursor, Copilot, ChatGPT ou outra IA para programar no projeto. A IA ajuda
muito, mas sem contexto ela **inventa padrões**: cria `interface Task` no front, usa `class-validator`, faz query sem
filtro de workspace. Com o contexto certo, ela segue a arquitetura. Este documento diz como dar esse contexto.

## 1. Contexto que a IA precisa ter

| Ferramenta | Como passar o contexto |
|---|---|
| Claude Code | Lê o `CLAUDE.md` da raiz sozinha (ele aponta para o `AGENTS.md`) |
| Cursor | Lê o `AGENTS.md`; adicione também os docs relevantes com `@docs/04-backend-guia.md` |
| Copilot / Codex | Lê o `AGENTS.md` da raiz |
| ChatGPT / Claude no navegador | Cole o `AGENTS.md` + o guia da camada (04 ou 05) + o arquivo de exemplo mais parecido |

**Mínimo para qualquer tarefa:** `AGENTS.md` + o guia da camada + **um módulo pronto parecido** como exemplo.

## 2. Como pedir (modelo de prompt)

```text
Contexto: projeto ClickUNICAP. Siga AGENTS.md e docs/04-backend-guia.md.
Sou a Pessoa 4, dono dos módulos subtasks e comments.

Tarefa: criar a rota PATCH /api/comments/:id para editar um comentário.

Regras:
- só o autor pode editar (ForbiddenError caso contrário)
- comentário de outro workspace → NotFoundError
- reutilize updateCommentSchema de @clickunicap/shared
- siga o padrão de modules/tasks (controller → service → repository)

Entregue:
1. o código no módulo comments
2. testes unitários do service (autor, não autor, inexistente)
3. teste e2e (200, 403, 404 de outro workspace, 422)
Não altere arquivos fora de modules/comments e test/ sem me perguntar.
```

**Por que funciona:** diz quem você é (o dono e o escopo), aponta o padrão, lista as regras de negócio, pede
os testes junto e **limita os arquivos** que a IA pode mexer.

## 3. Fluxo recomendado

1. **Planeje antes.** Peça à IA um plano ("liste os arquivos que vai criar e alterar e por quê") antes do código. Corrija o plano.
2. **Peça em pedaços.** Primeiro schema e migration, depois repository, depois service com testes, depois controller com e2e, depois a tela.
3. **Rode os testes você mesmo** a cada pedaço: `pnpm --filter api test -- <arquivo>`.
4. **Leia todo o código gerado.** Você é o autor do PR, não a IA. Se não entende uma linha, pergunte a ela ou remova.
5. **Use o checklist abaixo** antes de abrir o PR.

## 4. Checklist de revisão de código gerado por IA

Erros que IA comete com frequência neste tipo de projeto:

- [ ] **Redefiniu tipos** que já existem no `@clickunicap/shared`?
- [ ] **Esqueceu o filtro de `workspaceId`** em alguma query?
- [ ] Colocou **regra de negócio no controller** ou SQL no service?
- [ ] Usou **`class-validator`/`class-transformer`** em vez de Zod?
- [ ] Lançou **`HttpException`** dentro do service em vez dos erros de `core/errors`?
- [ ] Importou o **repository de outro módulo**?
- [ ] No front, buscou dados com **`useEffect` + `fetch`** em vez de TanStack Query?
- [ ] Uma feature **importou outra feature**?
- [ ] Guardou token em **`localStorage`**?
- [ ] Usou **`any`**, `as unknown as`, `!` ou `@ts-ignore` para "fazer compilar"?
- [ ] Os testes **verificam algo de verdade** ou só chamam a função? (teste sem `expect` não vale)
- [ ] Testes ficaram **mockando a própria função testada**?
- [ ] Inventou **biblioteca nova** que não está na stack? (Se precisar, discuta com o time e crie um ADR.)
- [ ] Editou **migration antiga** ou arquivo de outro dono?
- [ ] Deixou `console.log`, código comentado ou `TODO` sem issue?

## 5. O que nunca delegar à IA sem revisão linha a linha

- Autenticação, tokens, permissões e guards.
- Migrations (leia o SQL gerado).
- Qualquer coisa que apaga dados.
- Mudanças em `packages/shared` e `core/` (afetam o time todo).

## 6. Dicas práticas

- Quando a IA errar o padrão, **não aceite e conserte depois**: diga "isso viola o docs/04, seção X, refaça".
- Se a mesma correção se repetir, **atualize o `AGENTS.md`** com a regra (via PR). O contexto melhora para todos.
- Peça à IA para **escrever o teste primeiro** em lógicas complicadas (posição do Kanban, ciclo de dependências).
- Para entender código de outra pessoa, peça "explique este módulo e como ele se liga ao resto" em vez de mudar nele.
