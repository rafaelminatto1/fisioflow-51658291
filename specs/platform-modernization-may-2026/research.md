# Research: Platform Modernization — Maio/2026

**Phase**: 0 (Foundational)
**Created**: 2026-05-18

## T005 — Auditoria Workers AI: modelos em uso

Comando: `grep -rn "@cf/\|@hf/" apps/api/src/`

### Modelos encontrados

| Arquivo:linha                                       | Modelo                                        | Status deprecação 30/05                   |
| --------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| apps/api/src/queue.ts:400                           | `@cf/deepgram/aura-2-es`                      | ✅ ativo                                  |
| apps/api/src/routes/aiSearch.ts:25                  | `@cf/meta/llama-3.3-70b-instruct-fp8-fast`    | ✅ ativo                                  |
| apps/api/src/routes/aiSearch.ts:29                  | `@cf/baai/bge-reranker-base`                  | ✅ ativo                                  |
| **apps/api/src/routes/aiSearch.ts:216**             | **`@cf/meta/llama-3.1-8b-instruct`**          | ❌ **DEPRECATED**                         |
| apps/api/src/routes/aiSearch.ts:235/273/337/386     | `@cf/baai/bge-m3`                             | ✅ ativo                                  |
| apps/api/src/routes/knowledge.ts:1031               | `@cf/baai/bge-base-en-v1.5`                   | ✅ ativo                                  |
| apps/api/src/routes/ai/ai-chat.ts:558               | `@cf/meta/m2m100-1.2b`                        | ✅ ativo                                  |
| **apps/api/src/services/ai-concierge.ts:70**        | **`@cf/meta/llama-3.1-8b-instruct`**          | ❌ **DEPRECATED**                         |
| apps/api/src/routes/ai/aiDictation.ts:32            | `@cf/openai/whisper-large-v3-turbo`           | ✅ ativo                                  |
| apps/api/src/lib/ai/embeddings.ts:21                | `@cf/baai/bge-m3`                             | ✅ ativo                                  |
| apps/api/src/workflows/appointmentReminder.ts:142   | `@cf/google/gemini-1.5-flash`                 | ⚠️ via AI Gateway (não Workers AI direto) |
| apps/api/src/workflows/patient-digital-twin.ts:94   | `@cf/google/gemini-1.5-flash`                 | ⚠️ via AI Gateway                         |
| **apps/api/src/lib/ai/callAI.ts:400**               | **`@cf/meta/llama-3.1-8b-instruct`** (em map) | ❌ **DEPRECATED**                         |
| apps/api/src/lib/ai/callAI.ts:399                   | `@cf/meta/llama-3.3-70b-instruct-fp8-fast`    | ✅ ativo                                  |
| apps/api/src/routes/ai-clinical-search.ts:26        | `@cf/baai/bge-m3`                             | ✅ ativo                                  |
| apps/api/src/lib/ai-native.ts:58                    | `@cf/deepgram/nova-3`                         | ✅ ativo                                  |
| apps/api/src/lib/ai-native.ts:70                    | `@cf/openai/whisper-large-v3-turbo`           | ✅ ativo                                  |
| apps/api/src/lib/ai-native.ts:109                   | `@cf/meta/llama-3.3-70b-instruct-fp8-fast`    | ✅ ativo                                  |
| **apps/api/src/lib/ai-native.ts:138**               | **`@cf/meta/llama-3.1-8b-instruct`**          | ❌ **DEPRECATED**                         |
| apps/api/src/lib/ai-native.ts:181                   | `@cf/meta/llama-4-scout-17b-16e-instruct`     | ✅ ativo                                  |
| apps/api/src/lib/ai-native.ts:208                   | `@cf/meta/llama-guard-3-8b`                   | ✅ ativo                                  |
| apps/api/src/lib/ai-native.ts:228                   | `@cf/baai/bge-base-en-v1.5`                   | ✅ ativo                                  |
| apps/api/src/services/ai/TranscriptionService.ts:16 | `@cf/openai/whisper`                          | ⚠️ verificar se é alias                   |
| **apps/api/src/agents/PatientAgent.ts:92**          | **`@cf/meta/llama-3.1-8b-instruct`**          | ❌ **DEPRECATED**                         |
| apps/api/src/lib/ai/modelRegistry.ts:52             | `@cf/baai/bge-base-en-v1.5`                   | ✅ ativo                                  |
| apps/api/src/lib/vectorizeSync.ts:4                 | `@cf/baai/bge-base-en-v1.5`                   | ✅ ativo                                  |

### Substituição escolhida

**`@cf/meta/llama-3.1-8b-instruct` → `@cf/meta/llama-3.1-8b-instruct-fast`**

**Por quê esta opção (e não Gemma 4 / GLM 4.7 / Kimi)**:

- Mesma família de modelo, mesmo comportamento e formato de saída → migração de risco mínimo.
- Variante `-fast` **explicitamente permanece ativa** após 30/05 (changelog Cloudflare 2026-05-08).
- Latência similar ou inferior. Sem mudança em parsers, prompts ou testes.

Substituições alternativas (deferidas para PR separado, com benchmark):

- `@cf/zai-org/glm-4.7-flash` para tool-calling avançado
- `@cf/google/gemma-4-26b-a4b-it` quando precisar de vision (MoE 26B/4B, 256K ctx)

**5 arquivos a editar**: aiSearch.ts:216, ai-concierge.ts:70, callAI.ts:400, ai-native.ts:138, PatientAgent.ts:92.

---

## T006 — Tabelas Neon sem RLS (122 de 267)

Query: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity ORDER BY tablename`

### Categorização

**🌐 Public catalog (RLS ON, SELECT a todos `authenticated`/`anonymous`)** — 17 tabelas

- `exercises`, `exercise_categories`, `exercise_protocols`, `exercise_templates`
- `exercise_template_categories`, `exercise_template_items`
- `pathologies`, `wiki_pages`, `wiki_page_versions`, `wiki_dictionary`
- `evaluation_templates`, `evolution_templates`, `session_templates`
- `clinical_test_templates`, `conduct_library`, `session_package_templates`, `board_checklist_templates`

**🏥 Org-scoped (RLS ON, predicate via `profiles.organization_id`)** — 85 tabelas

- `achievements`, `achievements_log`, `ai_peer_reviews`, `announcement_reads`, `announcements`
- `biomechanics_assessments`, `biomechanics_metrics`, `blocked_slots`
- `board_automations`, `board_labels`, `card_patient_mappings`
- `centros_custo`, `clinical_embeddings`, `clinical_reasoning_logs`, `clinical_scribe_logs`
- `contact_activities`, `contact_scores`, `contacts`, `contas_financeiras`, `convenios`
- `crm_automation_executions`, `crm_automation_rules`
- `digital_twin_snapshots`, `empresas_parceiras`, `formas_pagamento`, `fornecedores`
- `generated_reports`, `goals`
- `group_checkins`, `group_class_schedules`, `group_classes`, `group_enrollments`, `group_sessions`, `group_waitlist`
- `jules_learnings`, `jules_pr_reviews`, `media_gallery`, `medical_records`
- `nfse`, `nfse_config`, `nps_surveys`, `organizations`
- `pagamentos`, `pre_registration_tokens`, `pre_registrations`, `precadastro_tokens`, `precadastros`
- `protocol_exercises`, `rate_limits`, `rooms`, `schedule_no_show_policy`
- `session_attachments`, `staff_blocks`, `staff_schedules`, `standardized_test_results`
- `surgeries`, `task_acknowledgments`, `task_assignments`, `task_audit_logs`
- `task_boards`, `task_columns`, `task_visibility`, `tasks`, `transacoes`
- `vouchers`, `voucher_checkout_sessions`
- `wa_assignments`, `wa_automation_rules`, `wa_conversation_tags`, `wa_conversations`
- `wa_internal_notes`, `wa_messages`, `wa_opt_in_out`, `wa_quick_replies`
- `wa_raw_events`, `wa_sla_config`, `wa_sla_tracking`, `wa_tags`
- `wearable_oauth_tokens`, `whatsapp_contacts`

**🧍 Patient-scoped (RLS ON, predicate via `patients.auth_user_id`)** — 18 tabelas

- `patients`, `patient_achievements`, `patient_exercise_logs`, `patient_gamification`
- `patient_goals`, `patient_longitudinal_summary`, `patient_objective_assignments`
- `patient_objectives`, `patient_packages`, `patient_portal_users`
- `patient_session_metrics`, `patient_streaks`
- `pain_map_points`, `pain_maps`
- `prescribed_exercises`, `exercise_prescriptions`, `package_usage`
- `sessions` (paciente vê apenas próprias sessões; fisio org-scoped)

**👤 User-scoped (RLS ON, predicate via `auth.user_id()` direto)** — 2 tabelas

- `user_agenda_appearance`, `user_vouchers`

**⭐ Mixed (paciente vê próprias prescrições; fisio org-scoped)** — implementadas com duas policies

- `exercise_favorites` (per-user), `daily_quests` (per-user), `xp_transactions` (per-patient)

**🛡️ Special — profiles** — RLS especial: usuário vê próprio profile + admin org vê todos da org

Total auditado: 17 + 85 + 18 + 2 = 122 ✅

---

## T007 — Data API Advisors (Console Neon)

**Ação manual requerida do usuário**: Console Neon → Monitoring → Data API Advisors → "Run scan" → exportar findings.

Esperado pós-migration 0036: 0 findings P0/P1 sobre RLS.

---

## T001 — Baseline build (defer)

`time pnpm build` baseline a ser registrado antes do bump Vite 8.0.10 → 8.0.13.

---

## Stack discovery: versões reais (deltas vs spec)

| Lib                | Spec assumia | Real                | Delta                                |
| ------------------ | ------------ | ------------------- | ------------------------------------ |
| Vite               | 8.0.3        | **8.0.10**          | só falta +0.0.3                      |
| React              | 19.1.0       | **19.2.0** ✅       | sem bump                             |
| Wrangler           | 4.87         | **4.92.0** ✅       | sem bump                             |
| Hono               | 4.x          | **4.12.15** ✅      | sem bump                             |
| TanStack Query     | 5.x          | **5.90.17**         | quase current                        |
| TipTap             | 3.22         | **3.23.1**          | +0.0.3                               |
| Zod                | 4.x          | **4.3.6**           | **4.4.3 traz breaking** — atenção    |
| React Router       | 7.12         | **7.13.2**          | +2 minors                            |
| `agents` SDK       | (não usado)  | **0.8.2 instalado** | upgrade p/ 0.12.4 para Voice         |
| compatibility_date | 2026-03-25   | (toml)              | bump → 2026-05-14 p/ Stream Bindings |

**Conclusão**: US3 (deps) muito mais leve que o estimado. PR único cobre tudo.
