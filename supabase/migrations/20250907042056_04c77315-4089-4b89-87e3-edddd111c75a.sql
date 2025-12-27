-- Confirmar usuários de teste automaticamente para permitir login
-- NOTE: confirmed_at só pode ser atualizado para DEFAULT, então apenas atualizamos email_confirmed_at
DO $$
BEGIN
    UPDATE auth.users 
    SET email_confirmed_at = now()
    WHERE email IN (
      'admin@fisioflow.com.br',
      'joao@fisioflow.com.br', 
      'maria@fisioflow.com.br',
      'ana@email.com',
      'carlos@parceiro.com'
    ) AND email_confirmed_at IS NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erros (demo data não é crítica)
        NULL;
END $$;