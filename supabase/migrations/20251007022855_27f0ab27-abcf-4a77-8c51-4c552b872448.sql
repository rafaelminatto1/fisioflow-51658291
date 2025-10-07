-- Tabela para rastrear tentativas de login
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index para performance
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts(created_at DESC);

-- RLS: Apenas admins podem ver login attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
USING (public.user_is_admin(auth.uid()));

-- Função para registrar tentativa de login
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  _email text,
  _success boolean,
  _ip_address inet DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success, ip_address, user_agent)
  VALUES (_email, _success, _ip_address, _user_agent);
  
  -- Se houve falha, logar no audit também
  IF NOT _success THEN
    PERFORM public.log_audit_event(
      'LOGIN_FAILED',
      'login_attempts',
      NULL,
      NULL,
      jsonb_build_object('email', _email, 'ip', _ip_address)
    );
  END IF;
END;
$$;

-- View para sessões suspeitas (múltiplas falhas seguidas)
CREATE OR REPLACE VIEW public.suspicious_login_activity AS
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