# Migração Cloudflare + Neon — FisioFlow 2026

> **Data:** Março 2026
> **Status:** ✅ Fase 2 completa — Consolidação Total das APIs + Workers + Neon + Neon Auth
> **Relatório de Consolidação:** `brain/b6ee7d54-9c41-4da2-bd4d-238e9edb2437/walkthrough.md`

---

## Visão Geral

O FisioFlow consolidou sua camada de infraestrutura para uma arquitetura moderna baseada em Edge Computing e PostgreSQL Serverless, eliminando completamente as dependências de roteamento do Firebase Functions nas chamadas principais:

```
Frontend (React/Vite)
  → Cloudflare Pages (fisioflow.pages.dev)

API Consolidade (Hono + callWorkersApi)
  → Cloudflare Workers (fisioflow-api.rafalegollas.workers.dev)
  → Hyperdrive (pool de conexões nos PoPs do Cloudflare)
  → Neon PostgreSQL (sa-east-1, São Paulo)

Auth
  → Neon Auth (Provedor Principal - Integrado via @neondatabase/neon-js)
  → Firebase Auth (Mantido apenas como ponte legada)

Banco de Dados Principal (PostgreSQL)
  → Pacientes, Agendamentos, Evoluções, Exercícios, Financeiro, Perfis, etc.

Firestore (Legado)
  → Mantido apenas para compatibilidade de dados legados não migrados.
```

### Principais Ganhos

| Indicador | Antes (Firebase) | Depois (Cloudflare + Neon) |
|---|---|---|
| **Latência (Cold Start)** | 2s - 5s | < 10ms |
| **Consultas** | NoSQL limitado | SQL Pleno (JOINs, Agregações) |
| **Auth** | Desconectado do BD | Integrado nativamente (Neon Auth) |
| **Arquitetura** | Monolito de Functions | Micro-serviços via roteamento edge |

---

## Consolidação de Roteamento (Março 2026)

Concluímos a refatoração do arquivo `src/integrations/firebase/functions.ts`, substituindo todas as chamadas `callFunctionHttp` por `callWorkersApi`.

- **Clinical/Evolution:** Mapeado para `/api/clinical` e `/api/evolution/treatment-sessions`.
- **Financial/Analytics:** Unificado sob `/api/analytics` e `/api/financial`.
- **Patients/Appointments:** Totalmente operacionais no Neon via API de Workers.
- **Exercises:** Biblioteca migrada para o Neon com busca semântica habilitada.

---

## Estrutura de Dados no Neon

### Tabelas PostgreSQL (Esquema `public` e `neon_auth`)

| Tabela | Função |
|---|---|
| `neon_auth.user` | Credenciais e roles de autenticação |
| `public.patients` | Dados centrais de pacientes |
| `public.appointments` | Agenda e compromissos |
| `public.medical_records` | Evoluções, prontuários e documentos |
| `public.exercises` | Biblioteca de exercícios e prescrições |
| `public.financial_transactions`| Gestão financeira e faturamento |

---

## O Que Ainda Precisa Ser Feito

### 🟢 Crítico (Concluídos)
1.  **Limpeza de Testes:** Suíte E2E reduzida para casos críticos via `test:e2e:critical` (6 fluxos core).
2.  **Remoção de Remanescentes `callFunctionHttp`:**
    - [x] `src/services/ai/marketingAITemplateService.ts`
    - [x] `src/components/reports/DoctorReferralReportGenerator.tsx`
    - [x] `src/hooks/useAIScheduling.ts`
3.  **Validação Final de Neon Auth:** `getNeonAccessToken` configurado para capturar erros de token expirado e renovar adequadamente em todo `workers-client.ts`.

### ✅ Concluído (Fases Anteriores)
1.  **Auth de API:** Todas as rotas principais validam JWT Neon.
2.  **Consolidação de Roteamento Core:** `functions.ts` refatorado para usar `callWorkersApi`.
3.  **Neon DB:** Pacientes, Agenda e Financeiro operando plenamente no PostgreSQL.
4.  **Analytics:** Métricas de dashboard servidas diretamente pelo Worker + Neon.
5.  **Descomissionamento Firestore:** Listeners `onSnapshot` removidos e substituídos por polling.
6.  **Migração de Mídias (R2):** Upload de arquivos agora utiliza Cloudflare R2.

---

## Próximos Passos (O que mais deve ser feito)

### 1. Desativação Completa do Firebase Backend
Assim que a suite `migration:verify` passar 100% em produção por 7 dias seguidos, proceder com:
- Desabilitar as Firebase Cloud Functions v1 e v2 no console do Google Cloud.
- Colocar o Firestore em modo `read-only` via Security Rules.
- Remover as dependências `firebase` e `firebase-admin` do `package.json`.

### 2. Otimização de Performance
- Implementar cache no nível do Hyperdrive para queries pesadas de Analytics.
- Ativar Cloudflare Rocket Loader e Early Hints para melhorar o LCP no dashboard.

### 3. Observabilidade
- Configurar logs do Cloudflare Workers para serem exportados para um Logpush ou Dashboard centralizado.
- Monitorar taxas de erro 401 no Sentry para validar a renovação de tokens do Neon Auth.

## Comandos Úteis
- **Verificação rápida:** `pnpm migration:verify`
- **Build & Deploy:** `pnpm build && pnpm workers:deploy`
- **Auditoria:** `python .agent/scripts/checklist.py .`
