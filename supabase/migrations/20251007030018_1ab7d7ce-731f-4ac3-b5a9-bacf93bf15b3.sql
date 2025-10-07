-- Adicionar política temporária para visualizar appointments sem autenticação (apenas para desenvolvimento)
-- IMPORTANTE: Remover em produção!

DROP POLICY IF EXISTS "Allow public read for development" ON appointments;

CREATE POLICY "Allow public read for development" 
ON appointments 
FOR SELECT 
TO anon
USING (true);

-- Comentário: Esta política permite visualização pública dos appointments
-- Deve ser removida antes do deploy em produção!