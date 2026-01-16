-- Confirmar email do usuário rafaelstarton@gmail.com
-- Isso permite login sem confirmação de email

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'rafaelstarton@gmail.com';
