# 04 — Domínios e Capacidades (AS-IS)

> Mapa dos domínios funcionais e seu status. Status detalhado por funcionalidade em `inventories/feature-status.csv`; regras em `06`; telas em `05`; APIs em `07`.

## Domínios identificados (com status agregado)

| Domínio | Capacidades principais | Status agregado | Tabelas-chave |
|---|---|---|---|
| **Organizações & multi-tenancy** | 1 org em prod, modelo multi-tenant, org switching | Confirmado (single-tenant de fato) | organizations, organization_members |
| **Usuários & RBAC** | 7 papéis, multi-role TEXT[], convites, aprovação pending | Confirmado (com gaps de enforcement) | profiles, user_invitations, neon_auth.* |
| **Pacientes & prontuário** | cadastro, diretório filtrável, prontuário, cirurgias, mapa de dor | Confirmado em produção | patients(986), medical_records, patient_surgeries, pain_maps |
| **Avaliação inicial** | formulários dinâmicos, templates, respostas, exame físico | Confirmado | evaluation_forms/templates/fields, physical_examinations |
| **Evolução clínica** | TipTap texto livre, autosave, colaboração Yjs, ditado voz, finalização | Confirmado em produção | sessions(11054), evolution_versions, evolution_measurements |
| **Agenda** | FullCalendar, recorrência, salas, bloqueios, feriados, lista de espera, no-show, booking público | Confirmado em produção | appointments(13941), recurring_series, rooms, blocked_times, waitlist, feriados |
| **Documentos & assinatura** | anexos, atestados, contratos, laudos, assinatura lógica | Implementado | patient_documents, document_signatures, atestado/contrato_templates |
| **Exercícios & HEP** | biblioteca (399), categorias, mídia/Stream, planos, protocolos, prescrição, logs, pose detection | Confirmado / Parcial (pose) | exercises, exercise_plans/items, exercise_protocols, patient_exercise_logs |
| **Financeiro** | pacotes, pagamentos, comissões, recibos, vouchers, fluxo de caixa, NFS-e | Confirmado / Parcial (NFS-e 0 emitidas) | patient_packages, package_usage, payments, therapist_commissions, recibos, nfse_* |
| **CRM & mensageria** | inbox WhatsApp, janela 24h, templates, opt-in/out, lead score, roteamento, campanhas, funil, Instagram, webchat | Confirmado em produção | wa_conversations, wa_messages, leads, contacts, crm_campanhas (+ trilho legado whatsapp_*) |
| **Tarefas & kanban** | boards, colunas, dependências, recorrência, integrações Jira/Asana/Monday | Confirmado em produção | tarefas, boards, board_columns, task_* |
| **NPS & indicações** | pesquisas, trigger on-response, referral codes | Implementado | nps_surveys, referral_codes/redemptions |
| **Relatórios & analytics/BI** | dashboards, insights, métricas de negócio/staff | Implementado | business_metrics, staff_performance_metrics, generated_reports |
| **IA clínica** | copilot, evidence (PubMed/CID-10), busca semântica pgvector, AutoRAG, morning briefing, digital twin, predições | Confirmado / Parcial (digital twin, AutoRAG sync morto) | clinical_embeddings, ai_config/models/usage_logs, digital_twin_snapshots, patient_predictions |
| **Biomecânica / visão computacional** | 6 telas RN, análise de movimento, workflow + DO | Mock (UI hardcoded; backend existe) | biomechanics_* (11 tabelas) |
| **Wiki & base de conhecimento** | páginas, versões, dicionário, curadoria, sync diário, comentários | Confirmado | wiki_pages, wiki_page_versions, knowledge_articles |
| **Gamificação** | XP, quests, achievements, streaks, loja, desafios | Implementado (paciente) | patient_gamification, xp_transactions, achievements, quest_definitions |
| **Telemedicina** | salas, LiveKit/Jitsi | Parcial (Jitsi público) | telemedicine_rooms |
| **Portal do paciente** | OTP telefone, HEP, agenda, chat, autoavaliação | Parcial (OTP inseguro, envio WA stub) | patient_portal_users, patient_self_assessments |
| **Wearables / saúde** | wearable_data, OAuth, HealthKit (app), workflow | Parcial (módulo workflow órfão) | wearable_data, wearable_oauth_tokens |
| **Marketing** | recall, aniversário, review, consents, calendário de conteúdo | Implementado | marketing_* (7 tabelas), content_calendar |
| **Inventário & recursos físicos** | inventário da clínica, movimentos, salas | Implementado não confirmado | clinic_inventory, inventory_movements, salas/rooms |
| **Grupos/turmas** | aulas em grupo, turmas, check-ins, waitlist | **Legado; fora do escopo e sem previsão no produto novo por decisão do proprietário (2026-07-13)** | Não migrar; apenas verificar dependências, exportar/arquivar se houver dados e descartar |
| **Admin, auditoria, segurança, LGPD** | audit logs, clinical access logs, security events, exclusão/exportação LGPD, retenção | Confirmado / Parcial (consents vazios) | audit_logs(422), clinical_access_logs, security_events, lgpd_* |
| **Importações / sincronização** | ZenFisio import (created_at histórico), wger, Google Calendar/Drive | Parcial | google_integrations, google_sync_logs |

## Domínios com maior maturidade (reconstruir com fidelidade alta)

Agenda, Pacientes/Prontuário, Evolução clínica, CRM WhatsApp, Financeiro (pacotes), Exercícios/HEP, Tarefas.

## Domínios frágeis / a decidir manter na reconstrução

Biomecânica (mock), Telemedicina (insegura), Portal do paciente (auth frágil), Wearables (parcial), NFS-e (nunca emitiu), MFA (decorativo), Digital Twin (rotas órfãs). **Grupos/turmas já estão decididos como fora do escopo, não como pergunta em aberto.**
