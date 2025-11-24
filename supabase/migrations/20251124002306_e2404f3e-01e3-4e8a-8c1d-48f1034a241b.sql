-- Dropar view existente se houver
DROP VIEW IF EXISTS suspicious_login_activity CASCADE;

-- Recriar view para atividades suspeitas de login
CREATE VIEW suspicious_login_activity AS
SELECT 
  email,
  COUNT(*) FILTER (WHERE NOT success) as failed_attempts,
  MAX(created_at) FILTER (WHERE NOT success) as last_attempt,
  array_agg(DISTINCT ip_address::text) as ip_addresses
FROM login_attempts
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY email
HAVING COUNT(*) FILTER (WHERE NOT success) >= 3
ORDER BY failed_attempts DESC;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_events_created ON security_audit_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- Comentários
COMMENT ON VIEW suspicious_login_activity IS 'Agregação de tentativas de login suspeitas nas últimas 24h';