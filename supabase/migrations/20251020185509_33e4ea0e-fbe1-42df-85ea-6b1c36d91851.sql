-- Tabela para rastrear rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP ou user_id
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_requests(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint ON public.rate_limit_requests(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_requests(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_composite ON public.rate_limit_requests(identifier, endpoint, window_start);

-- RLS: apenas service role pode acessar
ALTER TABLE public.rate_limit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role apenas"
ON public.rate_limit_requests
FOR ALL
USING (false); -- Nenhum usuário regular pode acessar

-- Função para limpar requests antigos (cleanup automático)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletar requests com mais de 1 hora
  DELETE FROM public.rate_limit_requests
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Função para verificar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier TEXT,
  _endpoint TEXT,
  _max_requests INTEGER,
  _window_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count INTEGER;
  _window_start TIMESTAMPTZ;
  _allowed BOOLEAN;
BEGIN
  -- Calcular início da janela
  _window_start := now() - (_window_minutes || ' minutes')::interval;
  
  -- Contar requests na janela atual
  SELECT COALESCE(SUM(request_count), 0)
  INTO _current_count
  FROM public.rate_limit_requests
  WHERE identifier = _identifier
    AND endpoint = _endpoint
    AND window_start >= _window_start;
  
  -- Verificar se excedeu o limite
  _allowed := _current_count < _max_requests;
  
  -- Se permitido, registrar a request
  IF _allowed THEN
    -- Tentar atualizar registro existente na janela atual
    UPDATE public.rate_limit_requests
    SET request_count = request_count + 1,
        updated_at = now()
    WHERE identifier = _identifier
      AND endpoint = _endpoint
      AND window_start >= _window_start
      AND window_start >= now() - interval '5 minutes'; -- Agrupa requests em janelas de 5min
    
    -- Se não existe, criar novo
    IF NOT FOUND THEN
      INSERT INTO public.rate_limit_requests (identifier, endpoint, request_count)
      VALUES (_identifier, _endpoint, 1);
    END IF;
  END IF;
  
  -- Retornar resultado
  RETURN jsonb_build_object(
    'allowed', _allowed,
    'current_count', _current_count + 1,
    'limit', _max_requests,
    'window_minutes', _window_minutes,
    'retry_after_seconds', CASE WHEN NOT _allowed THEN _window_minutes * 60 ELSE 0 END
  );
END;
$$;

COMMENT ON TABLE public.rate_limit_requests IS 'Rastreia requests para rate limiting';
COMMENT ON FUNCTION public.check_rate_limit IS 'Verifica se request está dentro do rate limit';
COMMENT ON FUNCTION public.cleanup_old_rate_limits IS 'Limpa registros antigos de rate limiting';