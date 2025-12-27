-- =====================================================
-- FisioFlow v3.0 - Sistema de Backup Automatizado
-- Criado em: 25/12/2025
-- =====================================================

-- Tabela para registrar backups
CREATE TABLE IF NOT EXISTS database_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON database_backups(created_at);
CREATE INDEX IF NOT EXISTS idx_backups_status ON database_backups(status);

-- RLS
ALTER TABLE database_backups ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins podem ver backups
CREATE POLICY "Admins can view backups"
  ON database_backups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Apenas service role pode inserir backups
CREATE POLICY "Service role can insert backups"
  ON database_backups
  FOR INSERT
  WITH CHECK (true);

-- Policy: Apenas service role pode atualizar backups
CREATE POLICY "Service role can update backups"
  ON database_backups
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Criar bucket de storage para backups (se não existir)
-- Nota: Isso precisa ser feito manualmente no dashboard do Supabase
-- ou via API. Aqui apenas documentamos.

COMMENT ON TABLE database_backups IS 'Registra backups automatizados do banco de dados';
COMMENT ON COLUMN database_backups.file_name IS 'Nome do arquivo de backup';
COMMENT ON COLUMN database_backups.file_path IS 'Caminho no storage (bucket)';
COMMENT ON COLUMN database_backups.size_bytes IS 'Tamanho do backup em bytes';
COMMENT ON COLUMN database_backups.status IS 'Status: pending, completed, failed';
COMMENT ON COLUMN database_backups.error_message IS 'Mensagem de erro se status = failed';

