-- REMOVER TODAS AS VIEWS PROBLEMÁTICAS
-- Como as views estão sendo criadas pelo superuser postgres,
-- vou removê-las completamente por enquanto para resolver o problema de segurança

DROP VIEW IF EXISTS public.appointments_full CASCADE;
DROP VIEW IF EXISTS public.therapist_stats CASCADE;

-- Não vou recriar as views agora para evitar problemas de segurança
-- O usuário pode criá-las posteriormente se necessário
-- através de consultas diretas nas tabelas