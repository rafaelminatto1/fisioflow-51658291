-- Remover a view anterior e recriar sem SECURITY DEFINER
DROP VIEW IF EXISTS public.suspicious_login_activity;

-- Criar view normal (sem SECURITY DEFINER)
CREATE VIEW public.suspicious_login_activity AS
SELECT 
  email,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt,
  array_agg(DISTINCT ip_address) as ip_addresses
FROM public.login_attempts
WHERE success = false
  AND created_at > now() - interval '1 hour'
GROUP BY email
HAVING COUNT(*) >= 3
ORDER BY failed_attempts DESC;

-- RLS na view também
ALTER VIEW public.suspicious_login_activity SET (security_invoker = true);