-- Extensões necessárias antes de qualquer tabela.
-- citext: e-mails sem diferenciar maiúsculas/minúsculas.
-- pgcrypto: gen_random_uuid() (nativo no PG13+, mantido por compatibilidade).
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
