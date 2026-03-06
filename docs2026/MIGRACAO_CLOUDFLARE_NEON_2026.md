# Migração Cloudflare + Neon — FisioFlow 2026

> **Data:** Março 2026
> **Status:** ✅ Fase 1 completa — Workers + Neon + Neon Auth rodando
> **Plano de fechamento:** `docs2026/PLANO_FECHAMENTO_MIGRACAO_CLOUDFLARE_NEON_2026.md`

---

## Visão Geral

O FisioFlow migrou sua camada de infraestrutura para uma arquitetura moderna baseada em Edge Computing e PostgreSQL Serverless:

```
Frontend (React/Vite)
  → Cloudflare Pages (fisioflow.pages.dev)

API (Hono)
  → Cloudflare Workers (fisioflow-api.rafalegollas.workers.dev)
  → Hyperdrive (pool de conexões nos PoPs do Cloudflare)
  → Neon PostgreSQL (sa-east-1, São Paulo)

Auth
  → Neon Auth (Provedor Principal - Integrado via @neondatabase/neon-js)
  → Firebase Auth (Mantido como ponte de compatibilidade/legacy)

Banco de Dados Principal (PostgreSQL)
  → Perfis, Organizações, Membros, Exercícios, Protocolos, Templates, Wiki

Firestore (Legado/Tempo Real)
  → Pacientes, Agenda, Evoluções (Migração em progresso)
```

### Por que essa migração?

| Problema | Solução |
|---|---|
| Cloud Functions: cold start 2-5s | Workers: cold start <5ms |
| Firestore: consultas complexas custosas | PostgreSQL: JOINs, full-text, agregações |
| Auth Fragmentado | Neon Auth: Autenticação que "nasce" com o banco de dados |
| Multi-tenancy complexo no Firestore | RLS Nativo no PostgreSQL |

---

## Arquitetura de Autenticação (Nova)

Diferente do plano inicial, migramos para **Neon Auth** para garantir que a identidade do usuário esteja no mesmo ecossistema do banco de dados relacional.

1.  **Neon Auth Client:** Gerencia sessões e tokens JWT.
2.  **Legacy Bridge:** `src/integrations/firebase/auth.ts` foi reescrito para mapear chamadas do Firebase para o Neon Auth, evitando quebras no frontend legado.
3.  **Single-Tenant Focus:** O sistema foi otimizado para a clínica principal, com o `organization_id` padrão (`00000000-0000-0000-0000-000000000001`) configurado no `AuthContextProvider`.

---

## Estrutura de Dados no Neon

### Tabelas PostgreSQL (Esquema `public` e `neon_auth`)

| Tabela | Função |
|---|---|
| `neon_auth.user` | Credenciais e roles de autenticação |
| `neon_auth.organization` | Dados da clínica |
| `public.profiles` | Perfil detalhado (nome, telefone, avatar) |
| `exercises` / `categories` | Biblioteca de exercícios |
| `exercise_templates` | Templates de treinos |
| `wiki_pages` | Base de conhecimento |

---

## O Que Ainda Precisa Ser Feito

### 🔴 Crítico
1.  **Limpeza de Testes:** A suite de testes E2E cresceu para 2500+ casos devido a matrizes de dispositivos. É necessário reduzir para ~100 testes críticos.

### 🟡 Importante
1.  **Migrar Pacientes:** Mover a coleção `patients` do Firestore para o Neon para permitir buscas complexas.
2.  **Migrar Agenda:** Mover `appointments` para o Neon, mantendo Firestore apenas para notificações push/tempo real.

### ✅ Atualização de 5 de março de 2026
1.  **Auth de API:** Rotas protegidas do Worker validam exclusivamente JWT Neon via JWKS.
2.  **Pacientes/Agenda na API:** Endpoints `/api/patients` e `/api/appointments` já operam no Neon PostgreSQL.
3.  **Mídias:** Dry-run de migração para R2 sem pendências nas tabelas alvo (`exercises`, `patients`, `session_attachments`, `sessions`).
4.  **Workflows Inngest:** Leituras de `patients/appointments` migradas para Neon (sem referências restantes em `src/inngest/workflows`).
5.  **Gate de deploy:** Suite mínima validada em produção com `pnpm test:e2e:deploy-gate` (auth + patients + appointments + R2).

---

## Comandos Úteis
- **Dev Frontend:** `pnpm dev`
- **Dev Workers:** `pnpm workers:dev`
- **Testes Críticos:** `pnpm test:e2e:auth` (Validado com sucesso!)
