# 08 — Modelo e Dicionário de Dados

> Fonte primária: banco Neon **real de produção** (`purple-union-72678311` / projeto "minatto", branch `production` = default, região `aws-sa-east-1`, Postgres 17), inspecionado em 2026-07-13 via MCP Neon + `psql` com role `app_readonly` em transação read-only [DB-001]. Dicionário completo (tabelas, colunas, tipos, nullability, índices, FKs, policies, enums, triggers, functions) em `inventories/database-objects.csv` (5.838 objetos).

## Números do banco de produção (schema `public`)

| Objeto | Quantidade |
|---|---|
| Tabelas | **303** |
| Colunas | **3.942** |
| Índices | 849 |
| Policies RLS | 339 |
| Foreign keys | 273 |
| Unique/Check constraints | Não exportadas com definição neste inventário; reextrair antes de gerar DDL |
| Triggers | 7 (distintos) |
| Views próprias | 0 (as 4 views existentes são de extensões: `pg_stat_statements*`, `proposed_indexes`, `proposed_statistics`) |
| Funções de usuário | 11 |
| Enums | 23 |
| Extensões | btree_gist, online_advisor, pg_prewarm, pg_session_jwt, pg_stat_statements, pg_trgm, pgcrypto, plpgsql, unaccent, **vector** (pgvector) |

Schema `neon_auth` (gerenciado pelo Neon Auth / Better Auth): `user, session, account, verification, jwks, organization, member, invitation, project_config` [DB-002].

## Volumetria (contagens agregadas, sem dados identificáveis) [DB-003]

| Tabela | Linhas |
|---|---|
| patients | 986 |
| appointments | 13.941 |
| sessions | 11.054 |
| exercises | 399 |
| tarefas | 112 |
| audit_logs | 422 |
| wa_messages | 151 |
| organizations | **1** (single-tenant na prática; modelo é multi-tenant) |
| profiles | **1** (⚠️ ver divergência abaixo) |
| transactions | 2 |
| lgpd_consents | **0** (estrutura existe, recurso não utilizado) |
| nfse_records | **0** (NFS-e estruturada, nunca emitida pela plataforma) |

⚠️ `profiles`=1 com ~5 papéis ativos no produto sugere que identidade de usuários vive majoritariamente em `neon_auth.user` e a tabela `profiles` do domínio está subpopulada — validar com o time (pergunta em aberto QA-DB-01).

## Roles Postgres no branch de produção [DB-004]

`neondb_owner` (bypassrls), `app_runtime` (runtime do Worker, sujeita a RLS), `app_readonly`, `analytics_readonly`, `app_migration`, `inngest` (**órfã** — Inngest foi removido do código em jun/2026), `authenticator`/`anonymous`/`authenticated` (Neon Data API/PostgREST).

## Dois databases no MESMO branch de produção [DB-005]

O branch `production` contém `neondb` (FisioFlow) **e** `gestao-saude` — um segundo database de outro projeto/experimento hospedado no branch de produção do FisioFlow. Risco operacional e de isolamento; recomenda-se não reproduzir no sistema novo.

## Fontes de schema e divergências

1. **Drizzle ORM cobre só ~23 tabelas** (`packages/db/src/schema/*.ts` + 4 pgTable inline em `apps/api/src/routes/templates.ts`) das 303 do banco. O restante do acesso é SQL cru (`pg` via Hyperdrive) e Neon Data API no frontend. O claim do `packages/db` de "single source of truth" NÃO se sustenta [SRC-DB-01]. A única tabela declarada no código e ausente no banco: `ai_usage_events`.
2. **Duas origens de migrations**: `apps/api/migrations/` (180 arquivos, 0000–0140, manuais, com `MIGRATIONS_STATUS.md` mantido à mão) e `drizzle/` na raiz (24 .sql gerados pelo Drizzle Kit, era antiga). Há ainda um gap histórico 0041–0048 aplicado pelo path extinto `workers/migrations/` [DOC-DB-01: apps/api/migrations/MIGRATIONS_STATUS.md].
3. **Não existe tabela de controle de migrations no banco** — aplicação manual rastreada só no markdown. Fonte de drift; o sistema novo deve ter migração com ledger no banco.
4. **272/280 tabelas fora do Drizzle são referenciadas no código**; **8 tabelas órfãs** (sem nenhuma referência em apps/ ou src/): `asset_annotations, empresas_parceiras, force_sessions, group_class_schedules, group_sessions, group_waitlist, precadastro_tokens, push_tokens` [DB-006].
5. **Duplicidades PT/EN** (gerações diferentes convivendo): `salas`×`rooms`, `transacoes`×`transactions`, `centros_custo`×`cost_centers`, `empresas_parceiras`×`partner_companies`, `precadastros`/`precadastro_tokens`×`pre_registrations`/`pre_registration_tokens`, `pagamentos`×`payments`, `fornecedores`×`suppliers`. O sistema novo deve unificar.

## Enums relevantes (valores reais de produção) [DB-007]

- `appointment_status` (17 valores, **poluído** com duas gerações EN+PT): `scheduled, confirmed, in_progress, completed, cancelled, no_show, rescheduled, agendado, atendido, avaliacao, faltou, faltou_com_aviso, faltou_sem_aviso, nao_atendido, nao_atendido_sem_cobranca, presenca_confirmada, remarcar`. Reconstrução deve definir máquina de estados única com mapeamento de migração.
- `session_status`: `draft, under_review, finalized, cancelled`
- `role`: `admin, fisioterapeuta, recepcionista, estagiario, paciente, parceiro, pending` (enum `user_role` é subconjunto sem `parceiro/pending` — duplicidade)
- `package_status`: `active, expired, used, cancelled, depleted`
- `payment_status`: `pending, paid, partial, refunded`
- `contact_lifecycle_stage`: `lead, mql, sql, opportunity, customer, churned`
- `appointment_type`: `evaluation, session, reassessment, group, return`
- Demais 15 enums em `database-objects.csv` (kind=enum).

## RLS (Row-Level Security)

- 339 policies; padrão dominante `org_isolation_*` com `current_setting('app.org_id', true)` (Worker) e policies `patient_self_read_*` por `request.jwt.claim.sub` (Data API).
- **Camadas sobrepostas**: tabelas centrais têm 3–4 policies redundantes de gerações distintas (ex.: `patients` tem `org_isolation_patients`, `patients_rls`, `policy_patients_isolation`, `patient_self_read_patients`) — funciona (policies são OR), mas dificulta auditoria [DB-008].
- Das 303 tabelas, **260 têm RLS habilitado e 43 estão com `rowsecurity=false`** no inventário. Há ainda duas anomalias que impedem interpretar “policy existente” como “isolamento garantido”: **33 tabelas têm policy cadastrada, mas RLS desabilitado**, e **28 têm RLS habilitado sem policy**. A lista exata é derivável de `database-objects.csv`; entre as 43 desabilitadas há dados clínicos e operacionais, como `exercise_prescriptions`, `pain_maps`, `surgeries`, `messages`, `generated_reports` e `organizations`. Além disso, o Worker de produção conecta como `neondb_owner` via Hyperdrive (BYPASSRLS), então o isolamento efetivo no caminho principal depende da APLICAÇÃO, não do banco [DB-009].

> Limite do inventário: os 5.838 registros representam 303 tabelas, 3.942 colunas, 849 índices, 339 policies, 273 FKs, 114 valores de enum, 11 funções e 7 triggers. Ele não contém a definição completa de CHECKs, UNIQUEs, defaults, funções, triggers ou policies e, portanto, **não deve ser transformado diretamente em schema executável**.
- Triggers de negócio no banco: `trg_lead_efetivado_to_patient`, `trg_lead_stage_to_contact_lifecycle` (leads), `trg_nps_on_response` (nps_surveys), touch triggers de updated_at [DB-010].

## Backup / PITR

- `purple-union-72678311`: history retention **7 dias** (PITR), branch `backup-2026-04-24-1138` arquivado; workflow GitHub `db-backup.yml` existe (verificar destino em 09) [CF/DOC].
- Projetos Neon adicionais na conta (fora do escopo FisioFlow, classificar): `fisioflow-production` (`calm-glitter-24420194`, us-east-1, criado 2026-07-05 — ⚠️ nome enganoso, NÃO é o prod real; retention 1 dia) e `gestao-saude-cloudflare` (`red-hall-80601762`, us-west-2). O prod real é `purple-union-72678311` — confirmado pelo Hyperdrive `fisioflow-neon` → endpoint `ep-wandering-bonus-acj4zwvo.sa-east-1` [CF-HD-01].

## Campos JSON

Uso extensivo de `jsonb` para `settings` (organizations.settings concentra: WhatsApp/WABA ids, templates cache, flags `dictation_enabled`, `crm_whatsapp.automations_enabled`, tokens IG etc.), payloads de avaliação, snapshot Yjs (`sessions.observacao_ydoc`, bytea/base64). Formatos conhecidos documentados em 06-regras e 07-apis.

## Ordem sugerida de migração (sem executar)

1. Referência sem FK (organizations, enums, catálogos: exercises, pathologies, servicos)
2. Identidade (neon_auth.*, profiles, organization_members, user_invitations)
3. Pacientes e clínico (patients → medical_records/avaliações → appointments → sessions → evoluções/anexos)
4. Financeiro (packages, payments/transactions, recibos, nfse_config)
5. CRM/mensageria (contacts, leads, wa_*, whatsapp_*)
6. Satélites (gamification, wiki, knowledge, biomechanics, tarefas)
7. Logs/auditoria por último (audit_logs, ai_usage_logs) — ou arquivar em R2.
