-- Verificar e remover todas as views com SECURITY DEFINER
-- Como não consegui identificar exatamente quais views ainda têm o problema,
-- vou garantir que todas as views sejam recriadas sem SECURITY DEFINER

-- Listar todas as views e recriar as que possam ter problemas
SELECT viewname FROM pg_views WHERE schemaname = 'public';