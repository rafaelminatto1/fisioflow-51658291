-- Sexo (M/F) para tratamento correto de Dr./Dra. nas mensagens
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
