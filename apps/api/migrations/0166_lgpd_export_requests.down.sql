-- Reverte 0166_lgpd_export_requests.sql
-- Destrutivo: descarta a trilha de pedidos de portabilidade (LGPD art. 18).
-- Exporte a tabela antes de rodar isto em produção.

DROP TABLE IF EXISTS public.lgpd_export_requests;
