# 00 — Resumo Executivo

> **Dossiê de Reconstrução do FisioFlow** — estado AS-IS auditado no commit `9b5c76f1069e5bc6bbab22397e69028d314cc3be` (branch `main`), em 2026-07-13. Modo estritamente somente leitura. Este documento NÃO propõe o sistema novo (isso é `15`/`16`); resume o que existe hoje.

## O que é o FisioFlow

Plataforma de gestão de clínica de fisioterapia, single-tenant na prática (1 organização em produção — clínica Mooca/Activity), com modelo de dados multi-tenant. Três produtos:
1. **Web desktop** (SPA React 19 + Vite 8) — produto principal, uso interno da clínica.
2. **App iOS Profissional** (Expo/RN) — 74 telas.
3. **App iOS Paciente** (Expo/RN) — 25 telas.

Backend único: Cloudflare Worker Hono (`fisioflow-api`) sobre Neon Postgres 17 (sa-east-1) via Hyperdrive. Autenticação Neon Auth (JWT/JWKS).

## Dimensão real do sistema (medida, não estimada)

| Métrica | Valor | Fonte |
|---|---|---|
| Endpoints de API | **1.191** (1.168 ativos, 23 órfãos) | inventories/api-endpoints.csv |
| Tabelas no banco de produção | **303** | DB-001 |
| Objetos de banco (col/idx/fk/policy/enum/trigger/func) | 5.838 | database-objects.csv |
| Rotas de UI (web) | **224 ativas** | ui-routes.csv |
| Telas/modais catalogados | 111 | screens.csv |
| Regras de negócio documentadas | **108** (13 domínios) | business-rules.json |
| Recursos Cloudflare | 63 linhas (15 Workers, 12 Workflows, 6 DOs, 3+ Queues, 13 R2, 2 D1, Vectorize, 2 AI Search…) | cloudflare-resources.csv |
| Integrações externas | **34** | integrations.csv |
| Arquivos de teste | 442 (139 API, 135 E2E, 167 unit) | tests.csv |
| Migrations manuais | 180 (0000→0140) | apps/api/migrations |
| Volumetria | 986 pacientes, 13.941 agendamentos, 11.054 sessões | DB-003 |

O sistema é **muito maior e mais maduro do que qualquer README sugere**, com forte adoção da plataforma Cloudflare (Workflows, DOs, Queues, Workers AI, Vectorize, AI Search, Stream, Browser Rendering, Pipelines, Analytics Engine).

## Cobertura desta auditoria

- ✅ Repositório, banco Neon real, conta Cloudflare, migrations, testes — inspecionados diretamente.
- ⚠️ **Runtime via navegador executado parcialmente** em produção como `admin`: login, agenda, pacientes, financeiro e prontuário do próprio usuário foram observados (`RUN-001..011`). O enforcement de fisioterapeuta, estagiário, recepcionista e paciente continua derivado do código e precisa de validação com contas de teste. Ver `20-cobertura-final.md`.
- ❌ Hermes Agent indisponível (não instalado).

## Principais divergências (detalhe em 14)

1. **Deploy web = Workers Assets, não Pages** — `ARCHITECTURE.md` está errado.
2. **Drizzle cobre só 23 das 303 tabelas** — "single source of truth" não se sustenta; acesso majoritário é SQL cru + Neon Data API.
3. **RLS praticamente inerte no caminho principal** — 339 policies existem, mas o Worker conecta como `neondb_owner` (BYPASSRLS); isolamento efetivo é feito por `WHERE organization_id` na aplicação. A role `app_runtime` correta nunca foi ativada em produção.
4. **2 Workflows declarados e ausentes** na conta (`nfse-emission`, `patient-discharge`); **4 cron cases mortos** (incl. RTM Clinical Alerts e AutoRAG sync que nunca executam).
5. **Duplicidade PT/EN massiva** no schema (salas×rooms, pagamentos×payments, wa_*×whatsapp_*, etc.) e enum `appointment_status` com 17 valores de 2 gerações.
6. **8 tabelas órfãs** e **8 módulos de rota nunca montados**.
7. **Segundo database `gestao-saude` no mesmo branch de produção** do FisioFlow.

## Principais riscos (detalhe em 10 e 14)

- **Segurança**: endpoints `POST /api/agents/*` e `GET/POST /api/whatsapp/admin/*` **sem autenticação**; feed `.ics` enumerável por patientId; OTP do portal do paciente sem rate limit; MFA decorativo (login não valida); Stripe sem webhook de confirmação; Jitsi sala pública sem senha.
- **LGPD**: CSV de pacientes reais e screenshots/transcrições de produção versionados/em disco no repo; `secrets/orthanc_*.txt` em texto plano; `lgpd_consents` vazia apesar de dados clínicos reais.
- **Operacional**: migrations sem ledger no banco (drift); user de runtime = owner; conta Cloudflare poluída com Workers de outros projetos.

## Recomendação arquitetural resumida (detalhe em 15)

Manter **Cloudflare + Neon como baseline** — é adequado, já dominado pela equipe, latência sa-east-1 boa para o Brasil, e a maior parte do lock-in (Workers AI, Stream, DOs) tem substitutos. As mudanças recomendadas na reconstrução são de **higiene e disciplina**, não de fornecedor: (1) ativar RLS de verdade com role de runtime não-owner; (2) schema único sem duplicação PT/EN, com ferramenta de migração com ledger; (3) unificar autenticação dos 3 clientes; (4) fechar os buracos de auth; (5) decidir React Native/Expo vs nativo para os apps (hoje compartilham ~zero código com a web). Alternativas comparadas: Supabase (Postgres+Auth+Storage gerenciados) e um stack "clássico" (Fly.io/Render + Postgres gerenciado).

## Próxima etapa sugerida

1. Completar a **Fase 3 runtime** com contas não-admin de teste e estados de erro/permissão (a passada `admin` já foi realizada).
2. Revisar as perguntas em aberto (`19-perguntas-em-aberto.md`) — várias exigem decisão do time.
3. Só então autorizar explicitamente o início da reconstrução (novo repositório) com base em `16-plano-de-reconstrucao.md`.
