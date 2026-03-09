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

### 🔴 Crítico
1.  **Limpeza de Testes:** A suite de testes E2E precisa ser reduzida de 2500+ para ~100 casos críticos focados na nova arquitetura. (Em progresso)

### ✅ Concluído (Fase 2)
1.  **Auth de API:** Todas as rotas validam JWT Neon.
2.  **Consolidação de Roteamento:** 100% das APIs no frontend portadas para `callWorkersApi`.
3.  **Neon DB:** Pacientes, Agenda e Financeiro operando plenamente no PostgreSQL.
4.  **Analytics:** Métricas de dashboard servidas diretamente pelo Worker + Neon.
5.  **Descomissionamento Firestore:** Listeners `onSnapshot` removidos e substituídos por polling em `useRealtime*`.
6.  **Migração de Mídias (R2):** Upload de arquivos agora utiliza Cloudflare R2 via Workers API.

---

## Comandos Úteis
- **Dev Frontend:** `pnpm dev`
- **Dev Workers:** `pnpm workers:dev`
- **Checklist de Saúde:** `python .agent/scripts/checklist.py .`
```
