-- Migration 0147: remove o sistema legado de fila de espera manual.
-- A fila de espera foi consolidada em `appointment_waitlist` (integrada ao
-- WhatsApp Flows). As tabelas `waitlist` e `waitlist_offers` estavam sem uso
-- (0 linhas) e sem FKs externas apontando para elas. Rollback em .down.sql.
-- NÃO confundir com `group_waitlist` (feature de grupos) nem com
-- `appointment_waitlist` (sistema novo) — essas permanecem.

DROP TABLE IF EXISTS waitlist_offers;
DROP TABLE IF EXISTS waitlist;
