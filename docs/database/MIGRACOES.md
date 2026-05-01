# Migrações de Banco de Dados — FisioFlow

> Stack: Neon PostgreSQL + Drizzle ORM  
> Última revisão: 2026-04-28  
> Status detalhado de cada migration: `apps/api/migrations/MIGRATIONS_STATUS.md`

---

## Dois sistemas de migration

| Sistema | Localização | Ferramenta | Quando usar |
|---|---|---|---|
| Auto (Drizzle Kit) | `drizzle/` | `drizzle-kit generate` + `drizzle-kit migrate` | Schema Drizzle → SQL gerado automaticamente |
| Manual SQL | `apps/api/migrations/` | Neon Console / SQL Runner | RLS, roles de DB, índices GIN, políticas de segurança |

Migrations manuais têm precedência operacional — são aplicadas primeiro e controlam políticas de acesso que o Drizzle não gerencia.

---

## Convenção de nomenclatura

```
NNNN_descricao_snake_case.sql         # migration de aplicação (up)
NNNN_descricao_snake_case.down.sql    # rollback correspondente
```

- `NNNN` é um número sequencial de 4 dígitos com incremento de 1
- Nunca reutilizar um número (mesmo após remoção)
- Gaps são permitidos (ex: 0041–0048 estão reservados para Drizzle auto-migrations)
- Arquivo `.down.sql` obrigatório para todas as novas migrations

**Validação automática:** `scripts/check-migrations.sh` — executado no CI como job `validate-migrations`

---

## Status atual (2026-04-28)

Todas as 18 migrations manuais confirmadas aplicadas em produção via Neon MCP.  
Ver tabela completa em `apps/api/migrations/MIGRATIONS_STATUS.md`.

Últimas migrations:
| Migration | Conteúdo | Prod |
|---|---|---|
| `0054_patient_directory_filters.sql` | Filtros de busca de pacientes | ✅ |
| `0055_ensure_tarefas_projects.sql` | Tabela de projetos de tarefas | ✅ |
| `0056_roles_rls_security.sql` | Role `app_runtime` + REVOKE público | ✅ |
| `0057_rls_complete.sql` | RLS em tabelas clínicas críticas | ✅ |

---

## Como criar uma nova migration

```bash
# 1. Identificar o próximo número
ls apps/api/migrations/*.sql | grep -v down | sort | tail -1
# Saída ex: 0057_rls_complete.sql → próximo é 0058

# 2. Criar os arquivos
touch apps/api/migrations/0058_minha_feature.sql
touch apps/api/migrations/0058_minha_feature.down.sql

# 3. Escrever o up (idempotente quando possível)
# Usar IF NOT EXISTS, IF EXISTS, CREATE OR REPLACE quando disponível

# 4. Escrever o down
# Inverso exato do up — DROP / REVERT

# 5. Validar localmente
bash scripts/check-migrations.sh

# 6. Testar em staging (Neon branch)
# Neon Console → Branch staging → SQL Editor → executar migration

# 7. Abrir PR com checklist de migration preenchido
```

---

## Fluxo de aplicação em produção

```
dev local → PR com check-migrations.sh passando
         → staging (Neon branch ep-withered-glade-acrv7il7)
         → review + aprovação
         → prod (branch protegido br-dawn-block-acf1bzzv)
```

Nunca aplicar migration diretamente em prod sem testar em staging.

---

## Rollback de emergência

```bash
# 1. Identificar migration a reverter
# 2. Verificar se existe .down.sql
ls apps/api/migrations/NNNN_*.down.sql

# 3. Executar via Neon Console → SQL Editor (prod)
# Cole o conteúdo do .down.sql e execute

# 4. Verificar integridade
curl https://api-pro.moocafisio.com.br/api/health/ready

# 5. Registrar no RUNBOOK_INCIDENTS.md
```

Se não existir `.down.sql`, usar PITR (Point-in-Time Recovery) do Neon — retenção de 7 dias configurada (`history_retention_seconds: 604800`).

---

## Boas práticas

- Migrations devem ser **idempotentes** — usar `IF NOT EXISTS`, `CREATE OR REPLACE`
- Operações em tabelas grandes (> 10k linhas): usar `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL` primeiro, depois `UPDATE` em batch, depois `SET NOT NULL`
- Nunca usar `DROP TABLE` sem backup confirmado
- Documentar impacto no `MIGRATIONS_STATUS.md` após aplicação
- Índices grandes: considerar `CREATE INDEX CONCURRENTLY` (não suportado em transações, usar fora de bloco BEGIN/COMMIT)
