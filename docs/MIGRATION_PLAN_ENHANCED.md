# Plano Aprimorado de Migração Supabase → Firebase
## FisioFlow 100% Google Cloud

> **Baseado na análise real do codebase em Janeiro 2026**

---

## 📊 Situação Real Diagnosticada

### ✅ JÁ Implementado

| Componente | Status | Detalhes |
|------------|--------|----------|
| **Apps iOS** | ✅ Criados | `patient-ios`, `professional-ios` com Expo |
| **Firebase Hosting** | ✅ Ativo | `fisioflow-migration.web.app` |
| **Cloud Functions** | ✅ Deployadas | 30+ funções em `functions/src/` |
| **Firestore** | ✅ Configurado | Rules, indexes |
| **Storage** | ✅ Configurado | Bucket, rules |
| **shared-api** | ✅ Parcial | Auth, config, functions base |
| **Expo EAS** | ✅ Scripts | Build profiles configurados |

### ⚠️ Precisa Migrar (20 arquivos)

```
src/inngest/workflows/     (9 arquivos)
  ├── daily-reports.ts
  ├── expiring-vouchers.ts
  ├── notifications.ts
  ├── weekly-summary.ts
  ├── ai-insights.ts
  ├── appointments.ts
  ├── birthdays.ts
  ├── cleanup.ts
  ├── data-integrity.ts
  ├── feedback.ts
  └── reactivation.ts

src/hooks/                 (3 arquivos)
  ├── useUserProfile.ts
  ├── useOnlineUsers.ts
  └── useGamificationNotifications.ts

src/lib/                   (5 arquivos)
  ├── auth/mfa.ts
  ├── utils/query-helpers.ts
  ├── utils/medicalRecordHelpers.ts
  ├── gamification/quest-generator.ts
  └── vector/embeddings.ts

src/integrations/          (1 arquivo)
  └── supabase/client.ts
```

---

## 🎯 Plano em 4 Fases (15-20 dias)

### FASE 1: Fundação Firebase (Dias 1-3)

**Objetivo:** Expandir shared-api com wrappers completos

#### 1.1 Expandir shared-api/src/firebase/

- [ ] `auth.ts` - Adicionar MFA, custom claims
- [ ] `realtime.ts` - Wrapper para Firestore realtime
- [ ] `query.ts` - Query builder type-safe (substituindo Supabase)
- [ ] `presence.ts` - Sistema de presença (substituindo Supabase Presence)

#### 1.2 Criar utilitários de migração

- [ ] `packages/shared-api/src/migration/`
  - [ ] `types.ts` - Type mapping Supabase → Firebase
  - [ ] `helpers.ts` - Helpers de conversão

**Deliverables:**
- shared-api expandido com funcionalidades completas
- Sistema de presença com Firestore realtime
- Query builder type-safe

---

### FASE 2: Migrar Hooks (Dias 4-7)

**Objetivo:** Migrar hooks que usam Supabase

#### 2.1 Migrar hooks críticos

| Hook | Substituto | Esforço |
|------|-----------|---------|
| `useUserProfile` | `firebase/auth.ts` + `onAuthStateChanged` | 4h |
| `useOnlineUsers` | `firebase/presence.ts` (Firestore) | 6h |
| `useGamificationNotifications` | `firestore/realtime` | 2h |

#### 2.2 Atualizar imports

- [ ] Substituir `@/integrations/supabase/client` → `@fisioflow/shared-api`
- [ ] Atualizar types para Firebase
- [ ] Testar cada hook migrado

**Deliverables:**
- Hooks migrados e testados
- Zero dependências Supabase em hooks/

---

### FASE 3: Migrar Inngest Workflows (Dias 8-12)

**Objetivo:** Migrar workflows que usam Supabase

#### 3.1 Workflows por prioridade

**ALTA prioridade (bloqueiam features):**
- [ ] `appointments.ts` - Agendamentos
- [ ] `notifications.ts` - Notificações
- [ ] `daily-reports.ts` - Relatórios diários

**MÉDIA prioridade:**
- [ ] `weekly-summary.ts` - Relatórios semanais
- [ ] `expiring-vouchers.ts` - Vouchers expirando
- [ ] `ai-insights.ts` - Insights de IA
- [ ] `birthdays.ts` - Aniversários
- [ ] `feedback.ts` - Feedback

**BAIXA prioridade:**
- [ ] `cleanup.ts` - Limpeza
- [ ] `data-integrity.ts` - Integridade
- [ ] `reactivation.ts` - Reativação

#### 3.2 Padrão de migração

```typescript
// ANTES (Supabase)
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// DEPOIS (Firebase)
import { getDoc, doc } from '@fisioflow/shared-api';
const profile = await getDoc(doc(db, 'profiles', userId));
```

**Deliverables:**
- Workflows migrados para Firebase/Firestore
- Cloud Functions atualizadas se necessário

---

### FASE 4: Migrar Lib Utils (Dias 13-15)

**Objetivo:** Migrar utilitários que usam Supabase

| Arquivo | Descrição | Substituto |
|---------|-----------|------------|
| `lib/auth/mfa.ts` | MFA | Firebase Auth MFA |
| `lib/utils/query-helpers.ts` | Query helpers | Firebase query builder |
| `lib/utils/medicalRecordHelpers.ts` | Medical records | Firestore queries |
| `lib/gamification/quest-generator.ts` | Quests | Firestore + Functions |
| `lib/vector/embeddings.ts` | Embeddings | Cloud Vector AI (GCP) |

**Deliverables:**
- Utils migrados para Firebase
- Zero dependências Supabase em lib/

---

### FASE 5: Limpeza Final (Dias 16-17)

**Objetivo:** Remover Supabase completamente

#### 5.1 Remover arquivos Supabase

```bash
# Remover integração
rm -rf src/integrations/supabase/

# Remover dependências
pnpm remove @supabase/supabase-js supabase

# Remover types
rm -rf src/integrations/supabase/types/

# Limpar env vars
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

#### 5.2 Atualizar .env

```bash
# REMOVER
VITE_SUPABASE_URL=***
VITE_SUPABASE_ANON_KEY=***

# MANTER
EXPO_PUBLIC_FIREBASE_API_KEY=***
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=***
EXPO_PUBLIC_FIREBASE_PROJECT_ID=***
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=***
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=***
EXPO_PUBLIC_FIREBASE_APP_ID=***
```

**Deliverables:**
- Zero dependências Supabase
- Código limpo 100% Firebase

---

### FASE 6: Testes e Validação (Dias 18-20)

**Objetivo:** Garantir migração completa

#### 6.1 Testes unitários

- [ ] Testar Auth (login, logout, register)
- [ ] Testar Profile (CRUD)
- [ ] Testar Presence (online users)
- [ ] Testar Realtime subscriptions

#### 6.2 Testes E2E

- [ ] Fluxo completo de autenticação
- [ ] Fluxo de agendamento
- [ ] Fluxo de notificações
- [ ] Fluxo de gamificação

#### 6.3 Performance

- [ ] Bundle size analysis
- [ ] Lighthouse scores
- [ ] Firestore query performance

**Deliverables:**
- Migração validada
- Performance mantida ou melhorada
- Documentação atualizada

---

## 📈 Comparativo de Esforço

| Item | Plano Original | Plano Real | Diferença |
|------|----------------|------------|-----------|
| **Apps iOS** | Criar do zero | Já existem | -10 dias |
| **Firebase** | Configurar tudo | Já configurado | -5 dias |
| **shared-api** | Criar pacote | Expandir existente | -3 dias |
| **Arquivos Supabase** | 300+ | 20 | -50 dias |
| **Hooks** | 40+ | 3 | -15 dias |
| **TOTAL** | 81-124 dias | **15-20 dias** | **-80%** |

---

## 🚀 Começar Migração

```bash
# 1. Backup do estado atual
git add -A
git commit -m "backup: antes da migração Supabase → Firebase"

# 2. Criar branch de migração
git checkout -b feature/migrate-to-firebase

# 3. Instalar dependências Firebase (se necessário)
pnpm install

# 4. Começar pela FASE 1
```

---

## 📋 Checklist de Validação

### Pré-migração

- [ ] Backup do banco Supabase (dump SQL)
- [ ] Backup do Firestore (export)
- [ ] Documentar features críticas
- [ ] Testes passando (baseline)

### Pós-migração

- [ ] Zero imports de `@supabase/supabase-js`
- [ ] Zero imports de `@/integrations/supabase`
- [ ] Testes unitários passando
- [ ] Testes E2E passando
- [ ] Bundle size <= anterior
- [ ] Performance score >= anterior

---

## 🎯 Próximos Passos Imediatos

```bash
# Passo 1: Expandir shared-api
mkdir -p packages/shared-api/src/migration
mkdir -p packages/shared-api/src/firebase/realtime

# Passo 2: Criar wrappers
# - presence.ts (Firestore realtime)
# - query.ts (Query builder)

# Passo 3: Migrar primeiro hook (useUserProfile)
```

---

**Status:** Pronto para iniciar migração
**Estimativa:** 15-20 dias úteis
**Risco:** Baixo (migração bem definida)
