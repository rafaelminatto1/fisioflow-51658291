-- Migration: Criar roles de banco para RLS e seguranca
-- Ambiente: Neon Postgres
-- Data: 2026-04-12

-- Role: app_runtime (usado pelo Worker, sem BYPASSRLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime WITH NOBYPASSRLS;
  END IF;
END
$$;

-- Role: app_migration (usado pelo CI/migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_migration') THEN
    CREATE ROLE app_migration;
  END IF;
END
$$;

-- Role: analytics_readonly (usado para BI/relatorios)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_readonly') THEN
    CREATE ROLE analytics_readonly;
  END IF;
END
$$;

-- Role: app_readonly (opcional, para consultas de leitura sem modificacoes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_readonly') THEN
    CREATE ROLE app_readonly WITH NOBYPASSRLS;
  END IF;
END
$$;

-- Grants para app_runtime - acesso necessario para operacoes normais
-- Nota: NOBYPASSRLS impede que este role desabilite RLS
GRANT CONNECT ON DATABASE neondb TO app_runtime;
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT SELECT, UPDATE, DELETE ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Grants para app_migration - acesso completo para schema changes
GRANT CONNECT ON DATABASE neondb TO app_migration;
GRANT ALL PRIVILEGES ON SCHEMA public TO app_migration;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_migration;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_migration;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO app_migration;

-- Grants para analytics_readonly - so leitura
GRANT CONNECT ON DATABASE neondb TO analytics_readonly;
GRANT USAGE ON SCHEMA public TO analytics_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_readonly;

-- Grants para app_readonly
GRANT CONNECT ON DATABASE neondb TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

-- Comentario sobre NOBYPASSRLS:
-- A flag NOBYPASSRLS garante que este role respeita as politicas RLS
-- Sem ela, o role poderia desabilitar RLS implicitamente
-- Workers devem usar app_runtime para manter isolamento multi-tenant

-- Verificar criacao
SELECT rolname FROM pg_roles WHERE rolname IN ('app_runtime', 'app_migration', 'analytics_readonly', 'app_readonly');
