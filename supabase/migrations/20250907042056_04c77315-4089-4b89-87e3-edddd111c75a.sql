-- Confirmar usuários de teste automaticamente para permitir login
UPDATE auth.users 
SET email_confirmed_at = now(), confirmed_at = now()
WHERE email IN (
  'admin@fisioflow.com.br',
  'joao@fisioflow.com.br', 
  'maria@fisioflow.com.br',
  'ana@email.com',
  'carlos@parceiro.com'
) AND email_confirmed_at IS NULL;