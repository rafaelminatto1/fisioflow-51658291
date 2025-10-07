-- Política temporária: liberar leitura pública de pacientes para testes (remover antes de produção)
DROP POLICY IF EXISTS "Allow public read for development" ON patients;
CREATE POLICY "Allow public read for development"
ON patients
FOR SELECT
TO anon
USING (true);