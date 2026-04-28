-- Rollback: 0055_ensure_tarefas_projects
-- ATENÇÃO: Só executar se as tabelas estiverem vazias ou não forem mais necessárias.

DROP TABLE IF EXISTS projects CASCADE;
-- A tabela tarefas pode ter dados — NÃO dropar sem backup.
-- Se precisar remover colunas adicionadas: identificar e reverter individualmente.
