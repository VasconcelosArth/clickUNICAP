# 08 — Boas práticas e fluxo de trabalho

Este documento é o **acordo do time**: como trabalhamos com Git, como escrevemos código e quando algo está pronto.

## Fluxo Git

```
main          ← sempre funcionando. Ninguém faz push direto (branch protegida)
 └─ feat/4-comentarios-mencoes      ← uma branch por issue
 └─ fix/12-kanban-ordem-errada
 └─ docs/atualiza-modelo-dados
```

1. Pegue (ou crie) uma **issue** no GitHub e coloque no seu nome.
2. `git switch main && git pull && git switch -c feat/<numero-da-issue>-<descricao-curta>`
3. Commits pequenos e frequentes.
4. Atualize a branch com a `main` todo dia (`git pull --rebase origin main`).
5. Abra o PR **cedo**, como rascunho (draft), para o time ver a direção.
6. PR pronto → pelo menos **1 aprovação** de outra pessoa + CI verde → *squash merge*.

### Prefixos de branch

`feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`

### Mensagens de commit (Conventional Commits)

```
<tipo>(<escopo>): <o que mudou, no imperativo>

feat(comments): adiciona menção com @ no comentário
fix(kanban): corrige ordem ao soltar no fim da coluna
test(tasks): cobre filtro por responsável
docs(db): documenta tabela time_entries
chore(docker): fixa versão do postgres em 16
```

O escopo é o nome do módulo/feature. O `commitlint` valida no hook.

## Pull Requests

**Tamanho:** ideal abaixo de ~400 linhas alteradas. PR grande demais → divida.

**Descrição (template em `.github/pull_request_template.md`):**
- O que foi feito e por quê (link da issue: `Closes #12`).
- Como testar manualmente.
- Print ou GIF se mexeu em tela.
- Checklist da Definição de Pronto.

**Revisão:**
- Quem revisa olha: segue a arquitetura? Tem teste? Os testes testam algo de verdade? Tem caso de outro workspace?
- Comente com sugestão concreta. Use prefixos: `bloqueante:`, `sugestão:`, `dúvida:`, `nit:` (detalhe).
- Responda revisões em até 1 dia útil.

## Definição de Pronto (DoD)

Uma tarefa só está **pronta** quando:

- [ ] Funciona e atende os critérios de aceite da issue.
- [ ] Tem **testes** (unitário + e2e/componente) escritos junto, e todos passam.
- [ ] Lint, typecheck e testes passam no CI.
- [ ] Segue as camadas e as regras de [03 — Arquitetura](03-arquitetura.md).
- [ ] Migration criada e [06 — Banco](06-banco-de-dados.md) atualizado, se mexeu no banco.
- [ ] Rota documentada no Swagger, se criou rota.
- [ ] Estados de loading, erro e vazio tratados, se criou tela.
- [ ] Documentação atualizada, se mudou regra ou convenção.
- [ ] Revisado e aprovado por outra pessoa.
- [ ] Merge feito na `main` e testado no dia de integração.

## Padrões de código

### TypeScript
- `strict: true`. **Proibido `any`**: use `unknown` e estreite o tipo.
- Tipos de domínio vêm do `@clickunicap/shared`. Nunca duplique.
- Prefira `type` para formatos de dados e `interface` para contratos de classe.
- Nada de `!` (non-null assertion) para calar o compilador: trate o caso nulo.

### Nomes
| O quê | Padrão | Exemplo |
|---|---|---|
| Arquivos backend | kebab-case + sufixo | `tasks.service.ts`, `create-task.dto.ts` |
| Componentes React | PascalCase | `TaskCard.tsx` |
| Hooks | `use` + camelCase | `useTasks.ts` |
| Funções e variáveis | camelCase, verbo para funções | `calculatePosition()`, `isOverdue` |
| Constantes | UPPER_SNAKE | `MAX_UPLOAD_BYTES` |
| Booleanos | `is`, `has`, `can`, `should` | `canEdit`, `hasSubtasks` |

**Idioma:** código (variáveis, funções, tabelas, rotas) em **inglês**. Textos da tela, documentação, issues e
mensagens de commit em **português**.

### Funções
- Uma função faz **uma coisa**. Passou de ~40 linhas? Provavelmente dá para quebrar.
- Prefira funções **puras** para lógica (cálculo de posição, detecção de ciclo, formatação): são fáceis de testar.
- Mais de 3 parâmetros → receba um objeto.
- Retorne cedo (*early return*) em vez de aninhar `if`.

### Comentários
- O código diz **o quê**; o comentário diz **por quê**.
- Use JSDoc em funções exportadas de `packages/shared` e em services.
- `TODO` só com número de issue: `// TODO(#34): paginar quando passar de 500 tarefas`.

### Formatação e lint
- **Prettier** formata (o editor formata ao salvar). Ninguém discute estilo em PR.
- **ESLint** com regras de imports (fronteiras da arquitetura), React Hooks e acessibilidade (`jsx-a11y`).
- Husky + lint-staged rodam lint, format e testes relacionados no `pre-commit`.

## Segurança (checklist rápido)

- [ ] Toda query de negócio filtrada por `workspaceId`.
- [ ] Nenhum segredo no código. Segredos ficam só no `.env` (que está no `.gitignore`); o `.env.example` vai com valores falsos.
- [ ] Senhas com argon2; tokens só em cookie httpOnly.
- [ ] Upload: validar tipo e tamanho no **backend** (o front é só conveniência).
- [ ] Nunca montar SQL concatenando string; usar o Drizzle (`sql` com template tagueado, se precisar de SQL cru).
- [ ] Rate limit (`@nestjs/throttler`) em login, cadastro e recuperar senha.
- [ ] Mensagens de erro de login genéricas ("e-mail ou senha inválidos").

## Comunicação

- Travou mais de 1 hora? **Pergunte no grupo.** Travar em silêncio é o maior risco do projeto.
- Vai mudar algo do contrato (`packages/shared`, `core/`, schema de tabela de outra pessoa)? Avise **antes**.
- Decisão técnica grande? Escreva um ADR curto em `docs/adr/` e peça opinião.
