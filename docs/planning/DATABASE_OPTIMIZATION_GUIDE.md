# Guia de Implantação - Otimização do PostgreSQL FisioFlow

## 📋 Resumo das Migrações Criadas

Foram criadas **13 migrações SQL** para otimizar o banco de dados PostgreSQL do FisioFlow:

### FASE 1: Correções Críticas 🔴
| Migração | Descrição | Impacto |
|----------|-----------|---------|
| [00001_fix_rls_initplan_critical.sql](supabase/migrations/20260129000001_fix_rls_initplan_critical.sql) | Corrige 143 políticas RLS com InitPlan | 50-90% melhoria |
| [00002_add_missing_fk_index.sql](supabase/migrations/20260129000002_add_missing_fk_index.sql) | Adiciona índice faltante | Melhora JOIN |
| [00003_remove_duplicate_index.sql](supabase/migrations/20260129000003_remove_duplicate_index.sql) | Remove índice duplicado | Reduz storage |
| [00004_consolidate_audit_logs.sql](supabase/migrations/20260129000004_consolidate_audit_logs.sql) | Consolida 4 tabelas audit | Simplifica |
| [00005_consolidate_payments.sql](supabase/migrations/20260129000005_consolidate_payments.sql) | Consolida 3 tabelas pagamento | Unifica naming |
| [00006_fix_function_search_path.sql](supabase/migrations/20260129000006_fix_function_search_path.sql) | Corrige search_path | Melhora segurança |

### FASE 2: Otimizações de Performance 🟡
| Migração | Descrição | Impacto |
|----------|-----------|---------|
| [00007_remove_unused_indexes.sql](supabase/migrations/20260129000007_remove_unused_indexes.sql) | Remove índices não usados | 20-40% write |
| [00008_consolidate_rls_policies.sql](supabase/migrations/20260129000008_consolidate_rls_policies.sql) | Consolida políticas RLS | Reduz overhead |
| [00009_add_composite_indexes.sql](supabase/migrations/20260129000009_add_composite_indexes.sql) | Adiciona índices compostos | 20-80% query |

### FASE 3: Estrutura e Consistência 🟢
| Migração | Descrição | Impacto |
|----------|-----------|---------|
| [00010_rename_portuguese_tables.sql](supabase/migrations/20260129000010_rename_portuguese_tables.sql) | Renomeia tabelas PT→EN | Padroniza |
| [00011_add_integrity_constraints.sql](supabase/migrations/20260129000011_add_integrity_constraints.sql) | Adiciona constraints | Qualidade dados |
| [00012_create_missing_tables.sql](supabase/migrations/20260129000012_create_missing_tables.sql) | Cria 6 tabelas utilitárias | Infraestrutura |
| [00013_add_fulltext_search.sql](supabase/migrations/20260129000013_add_fulltext_search.sql) | Adiciona busca full-text | UX search |

---

## 🚀 Instruções de Implantação

### Pré-Implantação

1. **Backup Obrigatório**
   ```bash
   # Via Supabase CLI
   supabase db dump -f backup_before_optimization_$(date +%Y%m%d).sql

   # Ou via psql
   pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
   ```

2. **Capturar Baseline**
   ```bash
   psql -f scripts/performance_baseline.sql > baseline_before.txt
   ```

3. **Verificar Ambiente**
   ```sql
   -- Verificar versão PostgreSQL
   SELECT version();

   -- Verificar tamanho do banco
   SELECT pg_size_pretty(pg_database_size(current_database()));

   -- Verificar tabelas maiores
   SELECT
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 10;
   ```

### Implantação em Produção

1. **Aplicar Migrações em Ordem**
   ```bash
   # Via Supabase CLI
   supabase db push

   # Ou via psql (se conectar remotamente)
   psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/migrations/20260129000001_fix_rls_initplan_critical.sql
   psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/migrations/20260129000002_add_missing_fk_index.sql
   # ... e assim por diante
   ```

2. **Verificar Cada Migração**
   ```sql
   -- Verificar se políticas RLS foram criadas
   SELECT tablename, policyname FROM pg_policies WHERE policyname LIKE 'consolidated_%';

   -- Verificar se índices foram criados
   SELECT tablename, indexname FROM pg_indexes WHERE indexname LIKE 'idx_%';

   -- Verificar se tabelas foram criadas
   SELECT tablename FROM pg_tables WHERE tablename IN ('webhooks', 'feature_flags', 'error_logs');
   ```

3. **Capturar Novo Baseline**
   ```bash
   psql -f scripts/performance_baseline.sql > baseline_after.txt
   ```

4. **Comparar Resultados**
   ```bash
   diff baseline_before.txt baseline_after.txt
   ```

### Pós-Implantação

1. **Atualizar Código Frontend**

   Após a migração `00010_rename_portuguese_tables.sql`, atualize:

   ```typescript
   // src/lib/database/schema.ts
   // eventos → events
   // feriados → holidays
   // participantes → participants
   // centros_custo → cost_centers
   // salas → rooms

   // Encontre todas as referências:
   // grep -r "eventos\|feriados\|participantes\|centros_custo\|salas" src/
   ```

2. **Testar Funcionalidades Críticas**

   - [ ] Login/autenticação
   - [ ] CRUD de pacientes
   - [ ] Agendamento
   - [ ] Pagamentos
   - [ ] Busca de pacientes
   - [ ] Relatórios

3. **Monitorar Logs**

   ```sql
   -- Verificar erros de RLS
   SELECT * FROM error_logs WHERE created_at >= now() - INTERVAL '1 hour';

   -- Verificar performance de queries
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

4. **Limpeza (após 2 semanas)**

   ```sql
   -- Remover views de compatibilidade
   DROP VIEW IF EXISTS eventos;
   DROP VIEW IF EXISTS feriados;
   DROP VIEW IF EXISTS participantes;
   DROP VIEW IF EXISTS centros_custo;
   DROP VIEW IF EXISTS salas;

   DROP VIEW IF EXISTS audit_log;
   DROP VIEW IF EXISTS audit_log_enhanced;
   DROP VIEW IF EXISTS pagamentos;
   DROP VIEW IF EXISTS formas_pagamento;
   ```

---

## 📊 Monitoramento

### Queries de Monitoramento

```sql
-- ============================================================
-- Query 1: Verificar saúde do banco
-- ============================================================
SELECT
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value,
  'Should be stable or smaller after cleanup' as note;

-- ============================================================
-- Query 2: Tabelas maiores
-- ============================================================
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  n_live_tup as rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- ============================================================
-- Query 3: Índices não utilizados
-- ============================================================
SELECT
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND pg_relation_size(indexrelid) > 100000
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================
-- Query 4: Queries mais lentas
-- ============================================================
SELECT
  query,
  calls,
  total_exec_time / 1000 as total_seconds,
  mean_exec_time / 1000 as avg_seconds,
  stddev_exec_time / 1000 as stddev_seconds
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- ============================================================
-- Query 5: Políticas RLS com problemas
-- ============================================================
SELECT
  tablename,
  policyname,
  length(qual) as qual_length,
  CASE
    WHEN qual LIKE '%(SELECT auth.uid())%' THEN 'OPTIMIZED'
    WHEN qual LIKE '%auth.uid()%' THEN 'NOT OPTIMIZED'
    ELSE 'NO AUTH'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY length(qual) DESC
LIMIT 20;

-- ============================================================
-- Query 6: Conexões ativas
-- ============================================================
SELECT
  state,
  COUNT(*) as connections,
  AVG(extract(epoch from (now() - query_start))) as avg_duration_seconds
FROM pg_stat_activity
WHERE state IS NOT NULL
GROUP BY state
ORDER BY COUNT(*) DESC;
```

---

## 🎯 Impacto Esperado

### Métricas de Performance

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Queries RLS | Lentas | Rápidas | 50-90% |
| Write operations | Baseline | Otimizado | 20-40% |
| Storage do banco | X | X - 10% | -10% |
| Issues de segurança | 192 | 0 | -100% |

### Queries Impactadas

As seguintes queries terão melhoria significativa:

1. **Listagem de pacientes ativos**
   ```sql
   SELECT * FROM patients WHERE status = 'active';
   ```
   - Antes: Full table scan
   - Depois: Index scan com idx_patients_org_status

2. **Agendamentos futuros**
   ```sql
   SELECT * FROM appointments WHERE date >= CURRENT_DATE AND status = 'agendado';
   ```
   - Antes: Filter + Seq Scan
   - Depois: Index scan com idx_appointments_date_status

3. **Busca de pacientes**
   ```sql
   SELECT * FROM search_patients('joão');
   ```
   - Antes: ILIKE scans (lento)
   - Depois: GIN index search (rápido)

---

## 🔄 Rollback

Se precisar reverter uma migração:

```sql
-- Reverter Migração 00001 (RLS policies)
-- As políticas antigas foram salvas no migration
-- Basta recriá-las manualmente

-- Reverter Migração 00003 (índice duplicado)
CREATE INDEX CONCURRENTLY idx_patients_full_name_status
ON patients(full_name, status) WHERE status = 'active';

-- Reverter Migração 00010 (tabelas renomeadas)
ALTER TABLE events RENAME TO eventos;
-- ... etc
```

---

## 📝 Checklist de Validação

- [ ] Backup realizado e verificado
- [ ] Baseline capturado
- [ ] Migrações aplicadas em ordem
- [ ] Todas as políticas RLS criadas
- [ ] Todos os índices criados
- [ ] Novas tabelas criadas
- [ ] Views de compatibilidade funcionando
- [ ] Código frontend atualizado (para tabelas renomeadas)
- [ ] Testes funcionais passando
- [ ] Monitoramento configurado
- [ ] Documentação atualizada

---

## 🛠️ Troubleshooting

### Problema: Migração falha com "policy already exists"
**Solução:** Verifique se a política já existe e drop primeiro:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

### Problema: Índice já existe
**Solução:** Use `IF NOT EXISTS` ou drop primeiro:
```sql
DROP INDEX CONCURRENTLY IF EXISTS index_name;
```

### Problema: Queries lentas após migração
**Solução:** Execute `ANALYZE` nas tabelas afetadas:
```sql
ANALYZE patients;
ANALYZE appointments;
ANALYZE sessions;
```

### Problema: Erro de permissão RLS
**Solução:** Verifique se as políticas foram criadas:
```sql
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'table_name';
```

---

## 📚 Referências

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Full-Text Search in PostgreSQL](https://www.postgresql.org/docs/current/textsearch.html)

---

## ✨ Próximos Passos

Após a implantação das FASE 1-3:

1. **FASE 4 (Opcional):**
   - Implementar partitioning para tabelas grandes
   - Criar materialized views para analytics
   - Adicionar mais extensões PostgreSQL

2. **Monitoramento Contínuo:**
   - Configurar alertas no Supabase Dashboard
   - Revisar pg_stat_statements semanalmente
   - Verificar espaço em disco

3. **Otimizações Adicionais:**
   - Implementar connection pooling
   - Configurar cache (Redis/Vercel KV)
   - Otimizar queries N+1 no frontend

---

**Data de Criação:** 2026-01-29
**Versão:** 1.0
**Autor:** Claude Code Agent
