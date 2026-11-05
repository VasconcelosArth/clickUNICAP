# ADR 0003 — Contrato com Zod em `packages/shared`

- **Status:** aceita
- **Data:** 2026-11-04
- **Autor:** Pessoa 1

## Contexto
Back e front precisam concordar sobre o formato dos dados. Se cada lado declara seus tipos, eles divergem em
silêncio. As frentes também precisam de mocks confiáveis para trabalhar antes da API existir.

## Decisão
Cada entidade tem um **schema Zod** em `packages/shared/src/schemas`. O tipo TypeScript é derivado com `z.infer`.
O backend valida o body com o schema (`ZodValidationPipe`); o frontend valida formulários com o mesmo schema
(`zodResolver`); mocks do MSW são validados contra ele nos testes.

## Alternativas consideradas
| Opção | Prós | Contras |
|---|---|---|
| class-validator (padrão do NestJS) | Integrado ao Nest | Não roda no front; tipos duplicados |
| OpenAPI + geração de client | Contrato formal | Mais ferramentas, passo de geração, mais lento para iterar |
| **Zod compartilhado** | Uma fonte da verdade, roda nos dois lados | Swagger precisa converter o schema para documentar (`zod-to-json-schema`, em `core/swagger/zod-body.ts`) |

## Consequências
- Mudanças em `packages/shared` exigem revisão da Pessoa 1 (definido no `CODEOWNERS`).
- Quebrar o contrato quebra o typecheck do lado que não acompanhou, e o CI pega.
