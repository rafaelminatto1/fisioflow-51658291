-- Corrigir security_events view para não usar SECURITY DEFINER
-- Remover view antiga
DROP VIEW IF EXISTS public.security_events;

-- Recriar view sem SECURITY DEFINER
-- A segurança será controlada por RLS policies nas tabelas subjacentes
CREATE VIEW public.security_events 
WITH (security_invoker = true)
AS
SELECT 
  al.id,
  al.timestamp,
  al.action,
  al.table_name,
  p.full_name as user_name,
  p.email as user_email,
  al.old_data,
  al.new_data
FROM public.audit_log al
LEFT JOIN public.profiles p ON p.user_id = al.user_id
WHERE al.action LIKE '%ROLE%' OR al.action LIKE '%INVITATION%'
ORDER BY al.timestamp DESC;

COMMENT ON VIEW public.security_events IS 'View para monitoramento de eventos de segurança (mudanças de roles e convites) - usa security_invoker';