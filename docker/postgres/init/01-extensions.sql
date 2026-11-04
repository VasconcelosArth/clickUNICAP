-- Executado uma única vez, quando o volume do banco é criado.
-- citext: e-mails sem diferenciar maiúsculas/minúsculas (users.email, workspace_invites.email)
-- pgcrypto: gen_random_uuid() (já é nativo no PG13+, mantido por compatibilidade)
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
