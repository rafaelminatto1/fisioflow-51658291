-- 0097_organizations_pix_city.sql
-- S10 QA financeiro — colunas faltantes pra PIX QR (GET /api/recibos/:id/pix-qr).
-- Endpoint estava silent-fail (query references o.pix_key e o.city, ambas inexistentes).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN public.organizations.pix_key IS
  'Chave Pix usada para gerar QR Code dinamico em recibos (EMV BR Code).';
COMMENT ON COLUMN public.organizations.city IS
  'Cidade da clinica para o campo 60 do payload Pix EMV (max 15 chars).';
