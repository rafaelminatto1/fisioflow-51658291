-- Criar tabela de pacientes
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date TEXT,
  main_condition TEXT,
  observations TEXT,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Criar índice para verificação rápida de nome duplicado
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name, professional_id, is_active);
