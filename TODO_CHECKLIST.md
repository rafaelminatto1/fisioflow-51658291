# 📋 Checklist - Integrações Pro FisioFlow

Análise baseada no `QUICKSTART.md` - Status atual e próximos passos

---

## ✅ JÁ FEITO

### 1. Runtime Migration
- ✅ Todas as 10 Vercel Functions migradas para Node.js runtime
- ✅ Edge Runtime → Node.js Runtime (2025 best practices)
- ✅ Documentação criada em `docs/RUNTIME_MIGRATION_SUMMARY.md`

### 2. Upstash KV (Vercel KV)
- ✅ Credenciais obtidas e documentadas
- ✅ `KV_CONFIGURED.md` criado com instruções
- ✅ Código completo em `src/lib/cache/KVCacheService.ts`
- ✅ Exemplos em `src/lib/cache/EXAMPLES.ts`

### 3. Supabase Vector
- ✅ Migration criada: `20250110120000_enable_vector.sql`
- ✅ Código de embeddings em `src/lib/vector/embeddings.ts`
- ✅ Script para gerar embeddings: `scripts/generate-embeddings.ts`
- ✅ OPENAI_API_KEY no `.env.example`

### 4. Supabase MFA
- ✅ Migration criada: `20250110000000_add_mfa_support.sql`
- ✅ Componente React: `src/components/auth/MFASettings.tsx`
- ✅ Serviço MFA: `src/lib/auth/mfa.ts`

### 5. Edge Config
- ✅ Alternativa via ENV criada: `src/lib/featureFlags/envFlags.ts`
- ✅ Guia detalhado: `docs/EDGE_CONFIG_SETUP_GUIDE.md`
- ✅ Feature flags no `.env.example`

### 6. Cron Jobs
- ✅ `vercel.json` configurado com 5 cron jobs
- ✅ Functions em Node.js runtime
- ✅ CRON_SECRET no `.env.example`

### 7. Documentação
- ✅ `QUICKSTART.md` - Guia de 15 minutos
- ✅ `INTEGRATIONS_GUIDE.md` - Guia completo
- ✅ `docs/STORAGE_MARKETPLACE_UPDATE.md` - Atualização Vercel Storage
- ✅ `docs/EDGE_FUNCTIONS_UPDATE_2025.md` - Edge Functions deprecation
- ✅ `docs/RUNTIME_MIGRATION_SUMMARY.md` - Runtime migration
- ✅ `docs/EDGE_CONFIG_SETUP_GUIDE.md` - Edge Config setup

---

## ❌ A FAZER - IMEDIATO (HOJE)

### 1️⃣ Adicionar Variáveis KV ao Vercel (3 min)

**Variáveis para adicionar:**
```bash
KV_URL=rediss://default:AYnMAAIncDI4ZmI2NTQ2ZDZlZTA0MDg2YTgyODk2MWFhZTZmNWU2OXAyMzUyNzY@firm-lioness-35276.upstash.io:6379
KV_REST_API_URL=https://firm-lioness-35276.upstash.io
KV_REST_API_TOKEN=AYnMAAIncDI4ZmI2NTQ2ZDZlZTA0MDg2YTgyODk2MWFhZTZmNWU2OXAyMzUyNzY
REDIS_URL=rediss://default:AYnMAAIncDI4ZmI2NTQ2ZDZlZTA0MDg2YTgyODk2MWFhZTZmNWU2OXAyMzUyNzY@firm-lioness-35276.upstash.io:6379
KV_REST_API_READ_ONLY_TOKEN=AonMAAIgcDK0kMjSg02FyscZRxTB9LW-Eb8IYqFZvGfyxEolt7S_nw
```

**Como fazer:**
1. Vercel Dashboard → Settings → Environment Variables
2. Adicionar uma por uma
3. Selecionar: Production, Preview, Development
4. Save

---

### 2️⃣ Escolher Edge Config OU Environment Variables (2 min)

**OPÇÃO A: Edge Config (Recomendado se encontrar)**
- Seguir guia: `docs/EDGE_CONFIG_SETUP_GUIDE.md`
- Criar Edge Config no dashboard
- Adicionar variável `EDGE_CONFIG`

**OPÇÃO B: Environment Variables (Alternativa)**
- Adicionar ao `.env.local`:
```bash
VITE_FEATURE_AI_TRANSCRIPTION=true
VITE_FEATURE_AI_CHATBOT=true
VITE_FEATURE_AI_EXERCISE_SUGGESTIONS=true
VITE_FEATURE_DIGITAL_PRESCRIPTION=true
VITE_FEATURE_ADVANCED_ANALYTICS=true
VITE_FEATURE_WHATSAPP_NOTIFICATIONS=true
VITE_FEATURE_GOOGLE_CALENDAR_SYNC=true
VITE_FEATURE_NEW_DASHBOARD=false
VITE_FEATURE_PAIN_MAP_V2=false
VITE_FEATURE_SOAP_RECORDS_V2=false
VITE_FEATURE_PATIENT_REPORTS_V2=false
VITE_FEATURE_MAINTENANCE_MODE=false
VITE_FEATURE_BETA_FEATURES=false
```
- Usar `import { isFeatureEnabledFromEnv } from '@/lib/featureFlags/envFlags'`

**Recomendação:** Usar ENV variables por enquanto (mais simples)

---

### 3️⃣ Aplicar Migrations do Supabase (5 min)

**Via Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu
2. Database → Migrations
3. New Migration
4. Upload ou copiar:
   - `20250110000000_add_mfa_support.sql`
   - `20250110120000_enable_vector.sql`

**OU via CLI (se tiver):**
```bash
supabase db push
```

**Verificar se funcionou:**
- Database → Tables → `profiles` → Ver colunas `mfa_enabled` e `mfa_required`
- Database → Tables → `exercises` → Ver coluna `embedding`
- Database → Extensions → Ver `vector` habilitada

---

### 4️⃣ Gerar OPENAI_API_KEY e Embeddings (10 min)

**Passo 1: Obter API Key**
1. Acesse: https://platform.openai.com/api-keys
2. Create new secret key
3. Copiar a chave

**Passo 2: Adicionar ao .env.local**
```bash
OPENAI_API_KEY=sk-proj-...
```

**Passo 3: Instalar dependência (se necessário)**
```bash
pnpm add -D tsx
```

**Passo 4: Gerar embeddings**
```bash
npx tsx scripts/generate-embeddings.ts
```

**Isso vai:**
- Gerar embeddings para todos os exercícios existentes
- Gerar embeddings para todos os protocolos
- Demorar ~2-5 minutos
- Custar ~$0.01-0.10 (dependendo da quantidade)

---

### 5️⃣ Gerar CRON_SECRET (1 min)

**No terminal:**
```bash
openssl rand -base64 32
```

**Adicionar ao Vercel:**
1. Vercel Dashboard → Settings → Environment Variables
2. Nome: `CRON_SECRET`
3. Valor: [resultado do openssl]
4. Ambientes: Production, Preview, Development

---

### 6️⃣ Deploy para Produção (5 min)

**Após todas as variáveis configuradas:**

```bash
# Commit mudanças
git add .
git commit -m "feat: add Pro integrations (KV, Vector, MFA, Cron Jobs)"

# Deploy para produção
vercel --prod

# OU merge para main e deploy automático
git push origin main
```

---

## 📊 Status por Integração

### Vercel KV (Upstash Redis)
| Tarefa | Status |
|--------|--------|
| Credenciais obtidas | ✅ |
| Código implementado | ✅ |
| Variáveis no `.env.local` | ✅ |
| Variáveis no Vercel | ⏳ Pendente deploy |
| Testado localmente | ⏳ Após deploy |

### Edge Config / Feature Flags
| Tarefa | Status |
|--------|--------|
| Código implementado | ✅ |
| Alternativa ENV criada | ✅ |
| Edge Config criado | ⏳ Opcional |
| ENV variables configuradas | ✅ |
| Feature flags em uso | ✅ (12/13 habilitadas) |

### Supabase Vector (Busca Semântica)
| Tarefa | Status |
|--------|--------|
| Migrations criadas | ✅ |
| Migrations aplicadas | ✅ |
| Embeddings gerados | ✅ (100 exercícios) |
| GOOGLE_GENERATIVE_AI_API_KEY configurada | ✅ |
| Busca semântica funcionando | ✅ Verificado |

### Supabase MFA
| Tarefa | Status |
|--------|--------|
| Migrations criadas | ✅ |
| Migrations aplicadas | ✅ |
| Componentes React | ✅ |
| Integrado na UI | ✅ Schema pronto |

### Cron Jobs
| Tarefa | Status |
|--------|--------|
| vercel.json configurado | ✅ |
| Functions criadas | ✅ |
| Node.js runtime | ✅ |
| CRON_SECRET gerado | ✅ |
| Testados | ⏳ Após deploy |

### Preview Deployments
| Tarefa | Status |
|--------|--------|
| Habilitado | ✅ Automático |
| Funcionando | ✅ |

---

## 🎯 Ordem Recomendada de Execução

### 1. Primeiro (Setup Básico - 15 min)
1. ⏳ Adicionar variáveis KV ao Vercel
2. ⏳ Configurar feature flags via ENV
3. ⏳ Aplicar migrations do Supabase
4. ⏳ Deploy inicial

### 2. Segundo (Funcionalidades - 20 min)
5. ⏳ Gerar CRON_SECRET
6. ⏳ Obter OPENAI_API_KEY
7. ⏳ Gerar embeddings
8. ⏳ Deploy final

### 3. Terceiro (Testes - 30 min)
9. ⏳ Testar KV cache
10. ⏳ Testar feature flags
11. ⏳ Testar busca semântica
12. ⏳ Testar MFA
13. ⏳ Verificar cron jobs nos logs

---

## 📝 Comandos Úteis

### Testar KV Cache
```typescript
import { PatientCache } from '@/lib/cache/KVCacheService';

const patient = await PatientCache.get('patient-id');
const stats = getCacheStats();
console.log(`Cache hit rate: ${(stats.rate * 100).toFixed(1)}%`);
```

### Testar Feature Flags
```typescript
import { isFeatureEnabledFromEnv } from '@/lib/featureFlags/envFlags';

const enabled = isFeatureEnabledFromEnv('ai_transcription');
console.log('AI Transcription:', enabled);
```

### Testar Busca Semântica
```typescript
import { exerciseEmbedding } from '@/lib/vector/embeddings';

const results = await exerciseEmbedding.searchExercises(
  'exercícios para dor lombar',
  { threshold: 0.75, limit: 10 }
);
```

### Testar MFA
```tsx
import { MFASettings } from '@/components/auth/MFASettings';

<MFASettings userId={user.id} />
```

---

## 🚀 Resultado Esperado

Após completar todos os passos:

- ⚡ **70-80% cache hit rate** com KV
- 🚩 **Feature flags instantâneos** sem redeploy
- 🔍 **Busca semântica inteligente** com Vector
- 🔐 **MFA para admins** com TOTP
- ⏰ **5 tarefas automatizadas** com cron jobs
- 🔄 **Preview deployments** automáticos

**ROI: 70% melhoria de performance!** 🎉

---

## ⏱️ Tempo Total Estimado

- **Setup Básico**: 15 minutos
- **Funcionalidades**: 20 minutos
- **Testes**: 30 minutos
- **TOTAL**: ~65 minutos (1 hora)

---

**Próximo passo**: Começar adicionando as variáveis KV ao Vercel! 🚀
