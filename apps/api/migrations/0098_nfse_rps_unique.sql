-- 0098_nfse_rps_unique.sql
-- S10 fix: race condition no numbering de RPS em batch concorrente.
-- Sem UNIQUE constraint, 2 consumidores da queue podem ler MAX simultaneo
-- e gerar numero_rps duplicado (prefeitura SP rejeita).
-- Combine com retry-on-conflict no apps/api/src/queue.ts:generateNFSeForSession.

CREATE UNIQUE INDEX IF NOT EXISTS uq_nfse_records_org_numero_rps
  ON public.nfse_records (organization_id, numero_rps);

COMMENT ON INDEX uq_nfse_records_org_numero_rps IS
  'S10 - garante unicidade do RPS por organizacao (prefeitura SP exige).';
