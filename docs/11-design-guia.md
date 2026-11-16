# 11 — Guia de design

Este guia responde **como uma tela do ClickUNICAP deve parecer**. A base visual é o template
[Mosaic Lite](https://github.com/cruip/tailwind-dashboard-template), que só traz uma tela de dashboard. Por isso o guia
também define as telas que o template não tem, para que Lista, Kanban, Calendário, Gantt e detalhe da tarefa pareçam o
mesmo produto. A organização do código está no [guia do frontend](05-frontend-guia.md).

O [protótipo navegável](https://claude.ai/artifact/QXLrd8PmEc142FYeKfc52g) e este guia mostram o **produto completo** e
são referência visual. O que entra no código é só o que já tem rota no backend: a lista do que ainda fica de fora está em
[Rotas](05-frontend-guia.md#rotas).

## Regras de ouro

1. **Só use os tokens deste guia.** Nada de hexadecimal no componente, `bg-[#...]` ou tamanho inventado. A única
   exceção é a cor escolhida pelo usuário para o projeto (`project.color`).
2. **Procure em `components/ui` antes de escrever classes.** As receitas abaixo moram lá; a feature só usa o componente.
3. **Todo elemento funciona nos dois temas.** Cor de fundo, texto e borda sempre têm o par `dark:`.
4. **O neutro domina, o violeta é acento.** Violeta marca o que está ativo, selecionado ou em foco. Ação principal é
   botão escuro, não violeta.
5. **Cor nunca é a única informação.** Status, prioridade e prazo vencido sempre têm texto junto.
6. **Copie o visual, não o comportamento.** O template é `.jsx`; o código daqui segue as regras do
   [`AGENTS.md`](../AGENTS.md) (TypeScript, TanStack Query, acessibilidade).
7. **Precisa de algo que não está aqui?** Monte com os tokens existentes e acrescente a receita neste guia no mesmo PR.

## Onde este guia muda o template

São ajustes pequenos, que quase não alteram a aparência. Medimos o contraste com o critério WCAG AA (4,5:1 para texto).
**Quando houver diferença, vale este guia.**

| No template | Problema | Aqui usamos |
|---|---|---|
| Rótulos em `text-gray-400 dark:text-gray-500` | 2,54:1 no claro; 3,04:1 no escuro | `text-gray-500 dark:text-gray-400` (4,83:1 e 5,78:1) |
| Texto em `text-violet-500` | 3,66:1 sobre branco | `text-violet-700 dark:text-violet-400` (6,14:1 e 5,32:1). Ícones continuam `violet-500` |
| Selo em `text-green-700 bg-green-500/20` | 2,93:1 | Ver [Status e prioridade](#status-e-prioridade) |
| Ação perigosa em `text-red-500` | Abaixo de 4,5:1 sobre branco | `text-red-800 dark:text-red-400` (5,69:1 e 5,59:1) |
| Campo sem anel de foco (`focus:ring-0`) | Foco quase invisível no teclado | Acrescenta `focus-visible:ring-2 focus-visible:ring-violet-500/50` |
| Placeholder em `placeholder-gray-400` | 2,54:1 sobre branco | `placeholder-gray-500 dark:placeholder-gray-400` |
| `--font-inter` com `"sans-serif"` entre aspas | A fonte genérica de reserva não funciona | `sans-serif` sem aspas |
| `max-w-9xl` sem token definido | A classe não gera CSS | `--container-9xl` definido no tema |
| Primeira visita liga o tema escuro no `index.html`, e o React desliga | Pisca ao abrir | O padrão é claro nos dois lugares |

**Não traga do template:** `Banner.jsx`, o logo do Mosaic, os links para a Cruip em `DropdownHelp`, os dados de exemplo
dos cards e os formatadores `en-US`/`USD` (aqui é `pt-BR`/`BRL`).

## Tema

Vai em `apps/web/src/index.css`. É a única fonte das cores do app.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=fallback');
@import 'tailwindcss';

@plugin "@tailwindcss/forms" {
  strategy: base;
}

@custom-variant dark (&:is(.dark *));
@custom-variant sidebar-expanded (&:is(.sidebar-expanded *));

@theme {
  --shadow-sm: 0 1px 1px 0 rgb(0 0 0 / 0.05), 0 1px 2px 0 rgb(0 0 0 / 0.02);

  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #bfc4cd;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --color-gray-950: #030712;

  --color-violet-50: #f1eeff;
  --color-violet-100: #e6e1ff;
  --color-violet-200: #d2cbff;
  --color-violet-300: #b7acff;
  --color-violet-400: #9c8cff;
  --color-violet-500: #8470ff;
  --color-violet-600: #755ff8;
  --color-violet-700: #5d47de;
  --color-violet-800: #4634b1;
  --color-violet-900: #2f227c;
  --color-violet-950: #1c1357;

  --color-sky-50: #e3f3ff;
  --color-sky-100: #d1ecff;
  --color-sky-200: #b6e1ff;
  --color-sky-300: #a0d7ff;
  --color-sky-400: #7bc8ff;
  --color-sky-500: #67bfff;
  --color-sky-600: #56b1f3;
  --color-sky-700: #3193da;
  --color-sky-800: #1c71ae;
  --color-sky-900: #124d79;
  --color-sky-950: #0b324f;

  --color-green-50: #d2ffe2;
  --color-green-100: #b1fdcd;
  --color-green-200: #8bf0b0;
  --color-green-300: #67e294;
  --color-green-400: #4bd37d;
  --color-green-500: #3ec972;
  --color-green-600: #34bd68;
  --color-green-700: #239f52;
  --color-green-800: #15773a;
  --color-green-900: #0f5429;
  --color-green-950: #0a3f1e;

  --color-red-50: #ffe8e8;
  --color-red-100: #ffd1d1;
  --color-red-200: #ffb2b2;
  --color-red-300: #ff9494;
  --color-red-400: #ff7474;
  --color-red-500: #ff5656;
  --color-red-600: #fa4949;
  --color-red-700: #e63939;
  --color-red-800: #c52727;
  --color-red-900: #941818;
  --color-red-950: #600f0f;

  --color-yellow-50: #fff2c9;
  --color-yellow-100: #ffe7a0;
  --color-yellow-200: #ffe081;
  --color-yellow-300: #ffd968;
  --color-yellow-400: #f7cd4c;
  --color-yellow-500: #f0bb33;
  --color-yellow-600: #dfad2b;
  --color-yellow-700: #bc9021;
  --color-yellow-800: #816316;
  --color-yellow-900: #4f3d0e;
  --color-yellow-950: #342809;

  --font-inter: 'Inter', sans-serif;

  --text-xs: 0.75rem;
  --text-xs--line-height: 1.5;
  --text-sm: 0.875rem;
  --text-sm--line-height: 1.5715;
  --text-base: 1rem;
  --text-base--line-height: 1.5;
  --text-base--letter-spacing: -0.01em;
  --text-lg: 1.125rem;
  --text-lg--line-height: 1.5;
  --text-lg--letter-spacing: -0.01em;
  --text-xl: 1.25rem;
  --text-xl--line-height: 1.5;
  --text-xl--letter-spacing: -0.01em;
  --text-2xl: 1.5rem;
  --text-2xl--line-height: 1.33;
  --text-2xl--letter-spacing: -0.01em;
  --text-3xl: 1.88rem;
  --text-3xl--line-height: 1.33;
  --text-3xl--letter-spacing: -0.01em;

  --breakpoint-xs: 480px;
  --container-9xl: 96rem;
}

@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-gray-200, currentColor);
  }
}
```

O `<body>` usa `font-inter antialiased bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400`.

**Tema claro e escuro:** a classe `dark` fica no `<html>` e a preferência em `localStorage.theme` (`light` ou `dark`). O
padrão é claro. Um script curto no `index.html` aplica o tema antes do React, para não piscar, e o provider de tema fica
em `app/providers.tsx`.

## Cores por função

| Função | Classes |
|---|---|
| Fundo da página | `bg-gray-100 dark:bg-gray-900` |
| Superfície (card, menu lateral, modal) | `bg-white dark:bg-gray-800` |
| Superfície secundária (cabeçalho de tabela) | `bg-gray-50 dark:bg-gray-700/50` |
| Hover de linha ou item | `hover:bg-gray-50 dark:hover:bg-gray-700/20` |
| Borda de componente | `border-gray-200 dark:border-gray-700/60` |
| Divisória dentro de card | `border-gray-100 dark:border-gray-700/60` |
| Texto forte (títulos, nomes) | `text-gray-800 dark:text-gray-100` |
| Texto normal | `text-gray-600 dark:text-gray-400` |
| Texto secundário (dentro de superfície) | `text-gray-500 dark:text-gray-400` |
| Texto de acento (links, menções, ativo) | `text-violet-700 dark:text-violet-400` |
| Ícone neutro | `text-gray-400 dark:text-gray-500` |
| Ícone ativo | `text-violet-500` |
| Erro e ação perigosa | `text-red-800 dark:text-red-400` |

Sobre o fundo da página, fora de uma superfície, use `text-gray-600 dark:text-gray-400` em vez do texto secundário.

## Tipografia

Fonte única: Inter, nos pesos 400, 500, 600 e 700.

| Uso | Classes |
|---|---|
| Título da página (`h1`) | `text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100` |
| Título de card com gráfico | `text-lg font-semibold text-gray-800 dark:text-gray-100` |
| Título de card com divisória | `font-semibold text-gray-800 dark:text-gray-100` |
| Número de destaque | `text-3xl font-bold text-gray-800 dark:text-gray-100` |
| Corpo, tabelas, formulários | `text-sm` |
| Rótulo de seção | `text-xs font-semibold uppercase text-gray-500 dark:text-gray-400` |
| Data e informação auxiliar | `text-xs font-medium text-gray-500 dark:text-gray-400` |
| Tempo e números que mudam | acrescente `tabular-nums` |

## Espaçamento, raios e camadas

| Item | Valor |
|---|---|
| Margem da página | `px-4 sm:px-6 lg:px-8 py-8` |
| Grade da página | `grid grid-cols-12 gap-6` |
| Cabeçalho da página até o conteúdo | `mb-8` |
| Interior de card | `p-5`; com tabela, `p-3`; cabeçalho `px-5 py-4` |
| Raio do card de página | `rounded-xl` |
| Raio de botão, campo, modal, menu e card pequeno | `rounded-lg` |
| Raio de selo, avatar e botão de ícone | `rounded-full` |
| Sombra de superfície parada | `shadow-xs` |
| Sombra de elemento flutuante | `shadow-lg` |
| Camadas | menu suspenso `z-10`, topo `z-30`, menu lateral `z-40`, modal `z-50` |

Breakpoints do Tailwind, mais `xs` (480px). O layout deve funcionar a partir de 375px de largura.

## Estrutura da aplicação

`AppLayout.tsx` reproduz esta estrutura:

```tsx
<div className="flex h-screen overflow-hidden">
  <Sidebar />
  <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
    <Header />
    <main className="grow">
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <Outlet />
      </div>
    </main>
  </div>
</div>
```

Kanban e Gantt ocupam toda a largura disponível: nessas páginas, retire o `max-w-9xl`.

**Menu lateral**

- Largura `w-64`, recolhido em `lg:w-20`, e sempre aberto em `2xl:w-64`. No celular é uma gaveta com fundo
  `bg-gray-900/30`.
- Superfície: `bg-white dark:bg-gray-800 p-4 rounded-r-2xl shadow-xs`.
- Preferência em `localStorage['sidebar-expanded']`, refletida na classe `sidebar-expanded` do `<body>`. O estado fica
  no Zustand.
- Ordem: logo, seletor de workspace (leva a `/workspaces`), **Minhas tarefas**, grupo **Projetos** (com o link **Ver
  todos**), grupo **Workspace** (Membros).
- Logo: quadrado de 32px com cantos de 9px em `violet-500`, sinal de confirmação branco e o nome ClickUNICAP em
  `text-base font-bold text-gray-800 dark:text-gray-100`.
- Item: `pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0`, com ícone de 16px e texto `text-sm font-medium`.
- Item ativo: `bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]` e ícone
  `text-violet-500`.

**Topo**

- `sticky top-0 z-30`, altura `h-16`, com `before:backdrop-blur-md` e `lg:border-b border-gray-200 dark:border-gray-700/60`.
- À direita, nesta ordem: tema, divisória, menu do usuário (leva a `/profile`).
- O sino de notificações entra antes do tema quando o módulo `notifications` existir. Busca global no topo só com rota
  nova: hoje a API busca dentro de um projeto, pelo filtro `search`.

**Cabeçalho da página:** `sm:flex sm:justify-between sm:items-center mb-8`, com o título à esquerda e as ações à direita
em `grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2`.

## Componentes base (`components/ui`)

**Button:** base `font-medium text-sm inline-flex items-center justify-center border border-transparent rounded-lg
leading-5 shadow-xs transition focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:outline-none
disabled:cursor-not-allowed disabled:opacity-50`.

| Tamanho | Classes |
|---|---|
| `lg` | `px-4 py-3` |
| `md` (padrão) | `px-3 py-2` |
| `sm` | `px-2 py-1` |
| `xs` | `px-2 py-0.5` |

| Variante | Classes |
|---|---|
| `primary` | `bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white` |
| `secondary` | `bg-white dark:bg-gray-800 border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300` |
| `danger` | `bg-red-800 text-white hover:bg-red-900` |
| `ghost` | `shadow-none text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50` |

**IconButton:** `w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 lg:hover:bg-gray-200
dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800`, com `aria-label` obrigatório.

**Input, Textarea e Select:** `bg-white dark:bg-gray-900/30 border text-sm text-gray-800 dark:text-gray-100 leading-5 py-2
px-3 border-gray-200 hover:border-gray-300 focus:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600
dark:focus:border-gray-600 shadow-xs rounded-lg focus:ring-0 focus-visible:ring-2 focus-visible:ring-violet-500/50
placeholder-gray-500 dark:placeholder-gray-400`.

- Rótulo: `block text-sm font-medium mb-1` e `<label>` sempre presente.
- Erro: borda `border-red-500` e mensagem `text-xs mt-1 text-red-800 dark:text-red-400`.
- Select: acrescente `pr-10`.

**Checkbox e Radio:** `text-violet-500 checked:bg-violet-500 checked:border-transparent border border-gray-300
dark:border-gray-700/60 focus-visible:ring-2 focus-visible:ring-violet-500/50`. Checkbox com `rounded-sm`.

**Switch:** trilho de 44×24px, botão de 20px; ligado `bg-violet-500`, desligado `bg-gray-400 dark:bg-gray-700`.

**Card:** `bg-white dark:bg-gray-800 shadow-xs rounded-xl`. Cabeçalho `px-5 py-4 border-b border-gray-100
dark:border-gray-700/60`.

**Tabela**

- Contêiner: `overflow-x-auto`; tabela: `table-auto w-full dark:text-gray-300`.
- `thead`: `text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50`, com `font-semibold` nas
  células.
- `tbody`: `text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60`. Células com `p-2`.

**Menu suspenso:** `origin-top-right z-10 absolute top-full min-w-44 bg-white dark:bg-gray-800 border border-gray-200
dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1`. Item: `font-medium text-sm text-gray-600
dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3`. Fecha com Esc e com clique fora (use
`event.key === 'Escape'`, não `keyCode`).

**Modal**

- Fundo: `fixed inset-0 bg-gray-900/30 z-50 transition-opacity`.
- Painel: `bg-white dark:bg-gray-800 border border-transparent dark:border-gray-700/60 rounded-lg shadow-lg max-w-2xl
  w-full max-h-full overflow-auto`.
- Use `<dialog>` com `showModal()`, que já prende o foco. O modal do template não faz isso, e a regra do projeto exige.

**Avatar:** `w-8 h-8 rounded-full`. Sem foto, mostra as iniciais em `bg-violet-500/20 text-violet-700 dark:text-violet-300
text-xs font-semibold`. Em grupo, `-ml-2 border-2 border-white dark:border-gray-800`.

**Abas de visão (Lista, Kanban, Calendário, Gantt):** contêiner `border-b border-gray-200 dark:border-gray-700/60`; aba
`text-sm font-medium pb-3 mr-6`. Ativa: `text-violet-700 dark:text-violet-400 border-b-2 border-violet-500`. Inativa:
`text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200`. A aba ativa vem da URL.

**Toast e Tooltip:** superfície `bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg
shadow-lg`, texto `text-sm`.

## Status e prioridade

Mesmo fundo nos dois temas, mudando só o tom do texto (todas as combinações ficam acima de 4,5:1). Os rótulos vêm de
`TASK_STATUS_LABELS` e `TASK_PRIORITY_LABELS`, do `@clickunicap/shared`.

Base do selo: `inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full`.

| Valor | Classes |
|---|---|
| Status `todo` | `bg-gray-400/20 text-gray-600 dark:text-gray-300` |
| Status `in_progress` | `bg-sky-500/20 text-sky-800 dark:text-sky-300` |
| Status `done` | `bg-green-500/20 text-green-800 dark:text-green-300` |
| Prioridade `low` | `bg-gray-400/20 text-gray-600 dark:text-gray-300` |
| Prioridade `medium` | `bg-violet-500/20 text-violet-700 dark:text-violet-300` |
| Prioridade `high` | `bg-yellow-500/20 text-yellow-800 dark:text-yellow-300` |
| Prioridade `urgent` | `bg-red-500/20 text-red-800 dark:text-red-300` |

Prazo vencido: `font-medium text-red-800 dark:text-red-400`, sempre com a data escrita.

Prazo e responsável são opcionais na API. Sem prazo, escreva **Sem prazo**. Sem responsável, use o Avatar com `–` em
`bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400` e o texto **Sem responsável**.

## Telas que o template não tem

**Autenticação (`AuthLayout`):** fundo da página, conteúdo centralizado com `max-w-sm w-full`, logo no topo, título
`text-3xl font-bold` e o formulário em um Card com `p-5`.

**Convite (`/invites/accept`):** mesmo layout. A API só informa o workspace depois do aceite, então a tela não mostra o
nome antes. Trata os erros de convite inválido ou expirado e de convite enviado para outro e-mail.

**Workspaces:** fundo da página e coluna `max-w-lg`. Lista em um Card (inicial, nome e selo do papel), Card de criação
abaixo e estado vazio para quem ainda não tem workspace.

**Projeto**

- Cabeçalho da página com o nome do projeto e a ação **Nova tarefa**.
- Resumo em três Cards: **Progresso**, **Vencidas** e **Vencem nesta semana**. São calculados no frontend, a partir da
  listagem sem filtros, para não mudarem quando alguém filtra.
- Abas de visão abaixo do resumo. Kanban vem primeiro e abre por padrão.
- Filtros abaixo das abas, valendo para Kanban e Lista: **Buscar por título** (Input), **Prioridade** e **Responsável**
  (Select) e **Limpar filtros** quando houver filtro ativo. Usam o `taskFiltersSchema` e ficam na URL.
- **Nova tarefa** abre um Modal com os campos do `createTaskSchema`: título e descrição, status, prioridade, responsável,
  início e prazo.

**Lista**

- Tabela padrão, agrupada por status: cada grupo em um Card, com selo e contagem no cabeçalho.
- Colunas: título, responsável, prazo, prioridade e, depois, os campos personalizados.
- Linha com `hover:bg-gray-50 dark:hover:bg-gray-700/20`. O título é um link em `text-gray-800 dark:text-gray-100`.

**Kanban**

- Contêiner: `flex gap-6 overflow-x-auto`. Coluna: `grow shrink-0 basis-72`, sem fundo próprio, para as três colunas
  ocuparem a largura disponível.
- Coluna vazia: `border-2 border-dashed border-gray-200 dark:border-gray-700/60 rounded-lg py-6 px-4 text-center`, com o
  texto **Nenhuma tarefa aqui**.
- Cabeçalho da coluna: selo do status e contagem, com `mb-4`.
- Cartão: `bg-white dark:bg-gray-800 shadow-xs rounded-lg p-4 mb-3 last:mb-0`, com título em `text-sm font-semibold
  text-gray-800 dark:text-gray-100`. Abaixo, prioridade e prazo à esquerda e avatar à direita.
- Arrastando: `shadow-lg ring-2 ring-violet-500/50`. Destino: `border-2 border-dashed border-gray-300
  dark:border-gray-700/60 rounded-lg`.

**Calendário**

- Dentro de um Card, grade `grid grid-cols-7`. Nomes dos dias como rótulo de seção.
- Dia: `min-h-28 p-2 border-t border-l border-gray-100 dark:border-gray-700/60`. Dias de outro mês em `opacity-50`.
- Hoje: número em círculo `w-6 h-6 rounded-full bg-violet-700 text-white`.
- Tarefa: `block truncate text-xs font-medium px-2 py-1 rounded-lg mb-1`, com as cores do status.
- Mês anterior e seguinte com IconButton; alternância mês/semana com botões `secondary`.

**Gantt**

- Dentro de um Card. À esquerda, nomes das tarefas em `w-64 shrink-0`; à direita, linha do tempo com `overflow-x-auto`.
- Cabeçalho de datas como rótulo de seção; linhas de grade `border-gray-100 dark:border-gray-700/60`.
- Barra: `h-6 rounded-lg`, em `bg-gray-400` (`todo`), `bg-sky-500` (`in_progress`) ou `bg-green-500` (`done`).
- Hoje: linha vertical `w-px bg-violet-500`. Dependências em SVG com `stroke-gray-400 dark:stroke-gray-500`.

**Detalhe da tarefa**

- Modal com `max-w-5xl`, aberto sobre a visão atual. Título em `text-xl font-bold text-gray-800 dark:text-gray-100`.
- Grade `grid grid-cols-12 gap-6`: `col-span-full lg:col-span-8` para as regiões `main`, `attachments` e `activity`, e
  `col-span-full lg:col-span-4` para `sidebar`.
- Cada slot é uma seção com rótulo de seção no topo, separada por `border-t border-gray-100 dark:border-gray-700/60
  pt-5 mt-5`. Slot não desenha Card próprio.
- Propriedades na região `sidebar`: rótulo à esquerda e valor à direita, com `text-sm`.
- Nada é gravado sozinho: **Salvar** (`primary`) fica no rodapé do modal, desabilitado enquanto não houver alteração,
  com **Excluir tarefa** à esquerda. Depois de salvar, mostre **Alterações salvas**.

**Subtarefas e comentários**

- Barra de progresso: trilho `h-1.5 rounded-full bg-gray-100 dark:bg-gray-700/60`, preenchimento `bg-violet-500`, e o
  texto `3/5` ao lado.
- Comentário: Avatar, nome em `text-sm font-semibold text-gray-800 dark:text-gray-100`, data como informação auxiliar,
  texto em `text-sm`. Menção: `font-medium text-violet-700 dark:text-violet-400`.

**Notificações** (entram no topo quando o módulo existir)

- IconButton no topo, com o ponto `absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-gray-100
  dark:border-gray-900 rounded-full` quando houver não lidas, e `aria-label` com a quantidade.
- Menu suspenso com `min-w-80`. Item: `block py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/20`, separado por
  `border-b border-gray-200 dark:border-gray-700/60 last:border-0`. Não lida: título em `font-medium text-gray-800
  dark:text-gray-100`.

**Anexos:** área de envio `border-2 border-dashed border-gray-300 dark:border-gray-700/60 rounded-lg p-5 text-center`,
com `border-violet-500` ao arrastar. Cada arquivo em uma linha, com ícone, nome, tamanho e ações.

**Campos personalizados:** usam Input, Select, Checkbox e Switch, sem estilo próprio.

**Controle de tempo:** cronômetro com `text-sm font-medium tabular-nums`. Enquanto conta, mostra o selo de `in_progress`
e o botão de pausa em `secondary`.

**Minhas tarefas:** tabelas padrão em Cards, agrupadas em **Vencidas**, **Nesta semana**, **Mais adiante** e **Sem
prazo**. Colunas: tarefa, projeto, status, prazo e prioridade. Grupo sem tarefas não aparece.

**Projetos:** Cards em `grid grid-cols-12 gap-6`, cada um com `col-span-full sm:col-span-6 xl:col-span-4`. Mostram um
ponto de 12px com `project.color`, nome, descrição e a ação **Arquivar** ou **Restaurar** (só admin). A opção **Mostrar
arquivados** usa `includeArchived`, e o projeto arquivado leva o selo cinza **Arquivado**.

**Membros:** Card de convite, tabela de pessoas e Card de convites pendentes. Convidar, trocar papel, remover e cancelar
convite são só para admin. O papel do dono fica bloqueado e ele leva o selo **Dono**. Quem não é dono pode **Sair**.

**Perfil:** coluna `max-w-2xl`. Card com Avatar de 64px, **Nome** e **Endereço da foto**, e o e-mail desabilitado, porque
a API não permite alterá-lo. **Sair da conta** fica em um Card separado.

## Estados de tela

| Estado | Como mostrar |
|---|---|
| Carregando | Blocos com o formato do conteúdo: `animate-pulse bg-gray-200 dark:bg-gray-700/60 rounded-lg` |
| Vazio | Centralizado, `py-12 text-center`: ícone neutro, título em texto forte, uma frase em `text-sm` e a ação principal |
| Erro | Mesmo formato do vazio, com a mensagem da API e o botão `secondary` "Tentar novamente" |

## Ícones

SVG em linha, preenchido, grade de 16×16 (`viewBox="0 0 16 16"`), com `fill-current shrink-0`. Setas de abrir e fechar
usam 12×12. Ficam em `components/ui/icons`. Ícone sem texto ao lado precisa de `aria-label`; ícone decorativo leva
`aria-hidden="true"`.

## Movimento

| Elemento | Transição |
|---|---|
| Hover de botão e link | `transition duration-150` |
| Abertura de menu | `transition ease-out duration-200`, de `opacity-0 -translate-y-2` para `opacity-100 translate-y-0` |
| Abertura de modal | `transition ease-in-out duration-200`, de `opacity-0 translate-y-4` para `opacity-100 translate-y-0` |
| Menu lateral | `transition-all duration-200 ease-in-out` |

Use `react-transition-group` para entrada e saída, e `motion-reduce:transition-none` em animações de deslocamento.

## Gráficos

Usados no relatório de horas e no dashboard do backlog, com Chart.js e cores lidas dos tokens CSS, nunca escritas no
código. `moment` existe só por causa de `chartjs-adapter-moment`; no resto do app, datas usam `date-fns`, em `pt-BR`.

| Elemento | Claro | Escuro |
|---|---|---|
| Linha principal | `violet-500`, 2px, sem pontos | igual |
| Série de comparação | `gray-500` a 25% | igual |
| Texto dos eixos | `gray-500` | `gray-400` |
| Grade | `gray-100` | `gray-700` a 60% |
| Tooltip | fundo branco, borda `gray-200` | fundo `gray-700`, borda `gray-600` |

Tooltip: raio de 8px, `padding` 8, sem seta. Séries seguem a ordem violeta, céu, verde, amarelo e vermelho.

## De onde vem cada peça

| No template | No ClickUNICAP |
|---|---|
| `src/css/style.css` | `apps/web/src/index.css` |
| `partials/Sidebar.jsx`, `partials/Header.jsx` | `app/layouts/` |
| `pages/Dashboard.jsx` (estrutura externa) | `app/layouts/AppLayout.tsx` |
| Classes `.btn` e `.form-*` | `components/ui/Button.tsx`, `Input.tsx` e afins |
| `DropdownProfile`, `DropdownNotifications` | `features/auth`, `features/notifications` |
| `utils/ThemeContext.jsx` | `app/providers.tsx` |
| `lib/utils.ts` (`cn`) | `lib/utils.ts` |
| `charts/ChartjsConfig.jsx` | `lib/` (quando houver gráfico) |

## Checklist visual do PR

- [ ] Só tokens deste guia: nenhum hexadecimal ou valor inventado.
- [ ] Conferido no tema claro e no escuro.
- [ ] Conferido em 375px e em tela larga.
- [ ] Reaproveita `components/ui` em vez de recriar botão, campo ou modal.
- [ ] Status e prioridade usam os selos deste guia, com texto.
- [ ] Foco visível no teclado.
- [ ] Carregando, vazio e erro seguem o padrão.
- [ ] Textos em português; datas e números em `pt-BR`.
