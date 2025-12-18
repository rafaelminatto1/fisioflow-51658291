-- Fix security definer view
DROP VIEW IF EXISTS public.crm_metricas_leads;
CREATE VIEW public.crm_metricas_leads 
WITH (security_invoker = true)
AS
SELECT 
  l.estagio,
  l.origem,
  COUNT(*) as total,
  COUNT(CASE WHEN l.estagio = 'efetivado' THEN 1 END) as convertidos,
  ROUND(AVG(EXTRACT(EPOCH FROM (
    CASE WHEN l.estagio IN ('efetivado', 'nao_efetivado') 
    THEN l.updated_at 
    ELSE now() 
    END - l.created_at
  )) / 86400)::numeric, 1) as dias_medio_no_funil,
  ROUND(AVG(l.score)::numeric, 1) as score_medio,
  COUNT(CASE WHEN l.data_ultimo_contato < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as leads_frios
FROM public.leads l
GROUP BY l.estagio, l.origem;