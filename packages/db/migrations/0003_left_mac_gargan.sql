-- Compatibilidade do histórico Drizzle: a migration 0002 original gerava FKs
-- transitórias para `public.tasks`, mas o modelo canônico usa `tarefas` legado
-- sem FK. Mantemos esta migration como no-op para não reescrever o journal.
SELECT 1;
