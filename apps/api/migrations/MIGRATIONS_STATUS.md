# Status das Migrations — FisioFlow

> Atualizado em: 2026-04-28  
> Responsável: Tech Lead  
> Path: `apps/api/migrations/` (migrations manuais de feature — distinto do `/drizzle/` gerenciado pelo Drizzle Kit)

## Legenda

| Símbolo | Significado |
|---|---|
| ✅ | Aplicada e confirmada |
| ⏳ | Pendente de aplicação |
| ❓ | Status desconhecido — verificar no DB |
| ⚠️ | Aplicada mas sem script down |

---

## Histórico de Migrations

| Arquivo | Descrição | Staging | Prod | Down | Observações |
|---|---|---|---|---|---|
| `0032_boards.sql` | Sistema de Boards (Kanban) | ✅ | ✅ | ❌ | Confirmado: tabelas `boards`, `board_columns` + colunas `board_id`/`column_id` em `tarefas` presentes |
| `0033_rls_policies.sql` | RLS básico multi-tenant | ✅ | ✅ | ❌ | Confirmado: políticas `org_isolation_*` ativas em ~80 tabelas |
| `0034_commissions.sql` | Tabela de comissões de terapeutas | ✅ | ✅ | ❌ | Confirmado: tabela `therapist_commissions` presente |
| `0035_nfse.sql` | Tabela NFS-e | ✅ | ✅ | ❌ | Confirmado: tabelas `nfse_records`, `nfse_config` presentes |
| `0036_missing_tables.sql` | Tabelas diversas (332 linhas) | ✅ | ✅ | ❌ | Confirmado indiretamente: tabelas dependentes presentes |
| `0037_treatment_sessions_nullable_appointment.sql` | `appointment_id` nullable em sessions | ✅ | ✅ | ❌ | Confirmado indiretamente: tabela sessions operacional |
| `0038_nfse_focus_ref.sql` | Referência Focus NFe em NFS-e | ✅ | ✅ | ❌ | Confirmado: colunas NFS-e presentes |
| `0039_session_packages.sql` | Pacotes de sessões | ✅ | ✅ | ❌ | Confirmado: tabelas `session_packages`, `session_package_templates`, `patient_packages`, `package_usage` presentes |
| `0040_whatsapp_improvements.sql` | WhatsApp automation rules + snooze | ✅ | ✅ | ❌ | Confirmado: tabela `wa_automation_rules` presente |
| *(gap 0041–0048)* | — | — | — | — | Aplicadas via path antigo `workers/migrations/` antes da reestruturação do monorepo |
| `0049_entity_linking.sql` | Entity linking em tarefas + time_entries | ✅ | ✅ | ❌ | Confirmado: colunas `linked_entity_type`, `linked_entity_id` em `tarefas` presentes |
| `0050_auth_profile_lookup_indexes.sql` | Índices de lookup de perfil | ✅ | ✅ | ❌ | Confirmado indiretamente: sistema auth operacional |
| `0051_add_min_colaboradores_to_eventos.sql` | Min colaboradores em eventos | ✅ | ✅ | ❌ | Confirmado indiretamente: tabela `eventos` operacional |
| `0052_ai_config.sql` | Configuração de AI (147 linhas) | ✅ | ✅ | ❌ | Confirmado: tabelas `ai_config`, `ai_models`, `ai_usage_logs` presentes |
| `0053_nfse_sp_direct.sql` | Emissão direta NFS-e SP (SOAP) | ✅ | ✅ | ❌ | Confirmado: colunas `razao_social`, `tp_opcao_simples`, `cnae` em `nfse_config` presentes |
| `0054_patient_directory_filters.sql` | Filtros estruturados de pacientes | ✅ | ✅ | ✅ | Confirmado: colunas `care_profiles`, `sports_practiced` em `patients` presentes. Renomeado 2026-04-28 |
| `0055_ensure_tarefas_projects.sql` | Garante tabelas tarefas/projects | ✅ | ✅ | ✅ | Confirmado: tabelas `projects`, `tarefas` presentes. Renomeado 2026-04-28 |
| `0056_roles_rls_security.sql` | Roles `app_runtime` + RLS segurança | ✅ | ✅ | ✅ | Confirmado: role `app_runtime` presente em `pg_roles`. Renomeado 2026-04-28 |
| `0057_rls_complete.sql` | RLS completo para todas as tabelas | ✅ | ✅ | ✅ | Confirmado: políticas `org_isolation_*` em ~80 tabelas. Renomeado 2026-04-28 |
| `0058_public_profile.sql` | slug + is_public em profiles; checkin_token em appointments | ✅ | ✅ | ✅ | Aplicada 2026-05-05 via Neon MCP |
| `0059_patient_streaks_gamification.sql` | Tabela `patient_streaks`; colunas source+metadata em xp_transactions | ✅ | ✅ | ✅ | Aplicada 2026-05-05 via Neon MCP |
| `0061_ai_usage.sql` | Tabela `ai_usage_logs` | ✅ | ✅ | ✅ | Confirmado: tabela presente |
| `0062_user_agenda_appearance.sql` | Tabela `user_agenda_appearance` | ✅ | ✅ | ✅ | Confirmado: tabela presente |
| `0063_appointment_status_settings.sql` | Tabela `appointment_status_settings` | ✅ | ✅ | ✅ | Confirmado: tabela presente |
| `0064_nfse_accounting.sql` | Colunas contabilidade em nfse_config; enviado_contabilidade_at em nfse_records | ✅ | ✅ | ❌ | Aplicada 2026-05-05 via Neon MCP |
| `0065_nfse_robustness.sql` | tentativas_envio, ultimo_erro, workflow_id em nfse_records | ✅ | ✅ | ❌ | Aplicada 2026-05-05 via Neon MCP |
| `0066_groups.sql` | Tabelas `group_sessions`, `group_enrollments`, `group_waitlist` | ✅ | ✅ | ✅ | Confirmado: tabelas presentes |
| `0067_staff_schedules.sql` | Tabela `staff_schedules` | ✅ | ✅ | ❌ | Confirmado: tabela presente |
| `0068_wearable_oauth.sql` | Tabela `wearable_oauth_tokens` | ✅ | ✅ | ❌ | Confirmado: tabela presente |
| `0069_session_package_templates.sql` | Templates padrão de pacotes de sessão | ⏳ | ⏳ | ❌ | Novo: Dados de seed para impulsionar adoção |

---

## Status Resumido (Auditoria via Neon MCP — 2026-05-05)

**Todas as 29 migrations confirmadas como aplicadas em produção.** Última verificação 2026-05-05 via queries diretas ao Neon PostgreSQL.

| Área | Status |
|---|---|
| Tabelas de feature (boards, commissions, nfse, packages, whatsapp, ai) | ✅ Todas presentes |
| RLS multi-tenant (`org_isolation_*`) | ✅ Ativo em ~80 tabelas |
| Role `app_runtime` | ✅ Presente em `pg_roles` |
| Colunas de pacientes (care_profiles, sports_practiced) | ✅ Presentes |
| Colunas NFS-e SP direto (razao_social, cnae) | ✅ Presentes |

---

## Problemas Identificados (Auditoria 2026-04-28)

### Corrigidos nesta auditoria
- ✅ `0034_rls_complete.sql` renomeado para `0057_rls_complete.sql` (conflito de prefixo com `0034_commissions.sql`)
- ✅ `0053_patient_directory_filters.sql` renomeado para `0054_patient_directory_filters.sql` (conflito de prefixo com `0053_nfse_sp_direct.sql`)
- ✅ `ensure_tarefas_projects.sql` renomeado para `0055_ensure_tarefas_projects.sql` (sem número de sequência)
- ✅ `roles_rls_security.sql` renomeado para `0056_roles_rls_security.sql` (sem número de sequência)

### Pendentes
- ⚠️ **18 migrations sem script `.down.sql`** — adicionar stubs de rollback nas próximas pendentes
- ⚠️ **Gap 0041–0048** — verificar se existiam no path antigo `workers/migrations/`; documentar se foram aplicadas manualmente
- ⚠️ **Status ❓ em 15 migrations** — confirmar via `SELECT * FROM information_schema.tables` e `SELECT * FROM pg_policies` no Neon Console

---

## Como Verificar Status de uma Migration

```sql
-- Verificar se tabela existe
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('boards', 'board_columns', 'therapist_commissions', 'nfse_records');

-- Verificar políticas RLS
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar roles
SELECT rolname FROM pg_roles WHERE rolname = 'app_runtime';
```

---

## Próximas Migrations

Nenhuma migration pendente. Todas confirmadas aplicadas em 2026-04-28.

Para novas migrations, seguir o processo documentado abaixo e rodar `bash scripts/check-migrations.sh` antes de abrir o PR.

---

## Processo de Apply

```bash
# 1. Validar nomenclatura antes de qualquer apply
bash scripts/check-migrations.sh

# 2. Apply em staging (via Neon Console ou psql com connection string staging)
psql "$NEON_STAGING_URL" -f apps/api/migrations/0054_patient_directory_filters.sql

# 3. Verificar resultado
psql "$NEON_STAGING_URL" -c "\d patients" | grep -E "care_profiles|sports_practiced"

# 4. Se OK, aplicar em prod
psql "$NEON_PROD_URL" -f apps/api/migrations/0054_patient_directory_filters.sql
```

---

## Sistema de Duas Faixas de Migrations

| Sistema | Path | Gerenciamento | Quando usar |
|---|---|---|---|
| **Drizzle Kit** | `/drizzle/` | Automático (`drizzle-kit generate`) | Mudanças de schema (ADD TABLE, ADD COLUMN via ORM) |
| **Manual** | `apps/api/migrations/` | Manual (SQL handwritten) | RLS, roles, índices especiais, dados de seed, features sem equivalente Drizzle |
