# ADR 0002 — Monólito modular em monorepo

- **Status:** aceita
- **Data:** 2026-11-04
- **Autor:** Pessoa 1

## Contexto
Dez pessoas trabalham em frentes diferentes ao mesmo tempo. Precisamos de isolamento entre as frentes para que
uma não quebre a outra, mas o projeto é acadêmico, com um banco e um deploy.

## Decisão
Um **único backend NestJS** dividido em **módulos por domínio**, cada um com dono, comunicando-se apenas por
**services exportados** ou **eventos de domínio**. Um único frontend dividido em **features**. Tudo num monorepo.

## Alternativas consideradas
| Opção | Prós | Contras |
|---|---|---|
| Microsserviços | Isolamento total | Rede, deploy, consistência distribuída e observabilidade: custo enorme sem ganho para 10 pessoas |
| Monólito sem regras | Rápido no início | Vira um emaranhado; todos mexem em tudo; conflitos |
| **Monólito modular** | Isolamento por dono, um deploy, transações simples | Exige disciplina nas fronteiras (lint + revisão) |

## Consequências
- As fronteiras são verificadas no ESLint e no checklist de PR.
- Se um módulo precisar virar serviço separado no futuro, ele já está isolado.
