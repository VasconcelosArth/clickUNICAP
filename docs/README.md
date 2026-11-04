# Documentação do ClickUNICAP

ClickUNICAP é um gerenciador de tarefas e projetos inspirado no ClickUp, feito por um grupo de 10 pessoas.
Esta pasta é a **fonte da verdade** do projeto: antes de escrever código, leia os documentos na ordem abaixo.

> **Usando IA para programar?** Leia primeiro o [`AGENTS.md`](../AGENTS.md) na raiz e o
> [09 — Guia para desenvolvimento com IA](09-guia-ia.md). Passe esses arquivos como contexto para a ferramenta.

## Ordem de leitura

| # | Documento | O que responde | Quem precisa ler |
|---|---|---|---|
| 01 | [Referência: como o ClickUp funciona](01-clickup-referencia.md) | O que estamos copiando, os conceitos e o vocabulário | Todos |
| 02 | [Organização do projeto e do time](02-organizacao-do-projeto.md) | Quem faz o quê, as fases, o fluxo de trabalho | Todos |
| 03 | [Arquitetura geral](03-arquitetura.md) | Stack, monorepo, como as peças conversam, decisões | Todos |
| 04 | [Guia do backend (NestJS)](04-backend-guia.md) | Como criar um módulo, camadas, validação, erros, auth | Quem mexe no `apps/api` |
| 05 | [Guia do frontend (React)](05-frontend-guia.md) | Estrutura por feature, dados do servidor, formulários, UI | Quem mexe no `apps/web` |
| 06 | [Banco de dados (Drizzle + Postgres)](06-banco-de-dados.md) | Modelo de dados, convenções, migrations | Todos que criam tabelas |
| 07 | [Testes](07-testes.md) | O que testar, onde, como rodar | Todos |
| 08 | [Boas práticas e fluxo de trabalho](08-boas-praticas.md) | Git, branches, commits, PR, revisão, Definição de Pronto | Todos |
| 09 | [Guia para desenvolvimento com IA](09-guia-ia.md) | Como usar IA sem quebrar a arquitetura | Quem usa IA |
| 10 | [Ambiente local e Docker](10-ambiente-local.md) | Como subir banco, API e web na sua máquina | Todos |
| — | [Decisões de arquitetura (ADRs)](adr/) | Por que escolhemos cada coisa | Quando quiser mudar algo grande |

## Regras de ouro (resumo de tudo)

1. **O contrato manda.** Tipos e validações compartilhados ficam em `packages/shared`. Backend e frontend importam de lá e nunca redefinem.
2. **Uma frente, um módulo.** Cada pessoa é dona de um módulo no backend (`apps/api/src/modules/<modulo>`) e de uma feature no frontend (`apps/web/src/features/<feature>`). Não edite o módulo de outra pessoa sem combinar.
3. **Sem teste, não está pronto.** Toda função nova vem com teste no mesmo PR. Ver [07 — Testes](07-testes.md).
4. **Controller fino, service com a regra, repository com o SQL.** Ver [04 — Backend](04-backend-guia.md).
5. **Mudou o banco? Migration + atualizar [06](06-banco-de-dados.md).** Nunca altere o banco à mão.
6. **Documentação é código.** Mudou uma regra, uma rota ou uma convenção? Atualize o doc no mesmo PR.

## Como manter esta pasta

- Todo arquivo começa com um parágrafo dizendo o que ele responde.
- Exemplos de código têm que compilar com a stack real. Se mudar a stack, atualize os exemplos.
- Decisão grande nova (trocar biblioteca, mudar padrão de pasta) → crie um ADR em [`adr/`](adr/) com o template.
