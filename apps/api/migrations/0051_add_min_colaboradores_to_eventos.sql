-- Migration 0051: Add minimo_colaboradores and participantes_previstos to eventos
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS minimo_colaboradores INTEGER DEFAULT 0;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS participantes_previstos INTEGER DEFAULT 0;
