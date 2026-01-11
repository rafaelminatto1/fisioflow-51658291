# 🔍 Guia de Verificação Final - Integrações Pro

Use este guia para verificar se tudo está configurado corretamente.

---

## ✅ CONFIGURAÇÕES LOCAIS - 100% COMPLETO

### Variáveis de Ambiente
```bash
✅ .env.local existe
✅ 4/4 variáveis KV configuradas
✅ 13/13 feature flags configuradas
✅ OPENAI_API_KEY configurada
✅ CRON_SECRET gerado e configurado
```

### Runtime Migration
```bash
✅ 10/10 Vercel Functions migradas para Node.js runtime
```

---

## ⏳ VERIFICAÇÕES MANUAIS NECESSÁRIAS

### 1️⃣ Variáveis no Vercel Dashboard

**Acesse:** Vercel Dashboard → Settings → Environment Variables

**Verifique se existem:**

#### KV (Upstash Redis)
- [ ] `KV_URL`
- [ ] `KV_REST_API_URL`
- [ ] `KV_REST_API_TOKEN`
- [ ] `REDIS_URL`
- [ ] `KV_REST_API_READ_ONLY_TOKEN`

#### OpenAI
- [ ] `OPENAI_API_KEY`

#### Cron Jobs
- [ ] `CRON_SECRET`

**Se não existirem:** Adicione manualmente seguindo o `TODO_CHECKLIST.md`

---

### 2️⃣ Migrations no Supabase

**Acesse:** https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu

#### Verificar se MFA foi aplicada:

**Opção 1: Via SQL Editor**
```sql
-- Execute esta query no SQL Editor
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('mfa_enabled', 'mfa_required');
```

**Esperado:**
```
column_name   | data_type
--------------|----------
mfa_enabled   | boolean
mfa_required  | boolean
```

**Opção 2: Via Table Editor**
1. Database → Tables → `profiles`
2. Verifique se as colunas `mfa_enabled` e `mfa_required` existem

**Se NÃO existirem:** Aplique a migration
1. Database → Migrations → New Migration
2. Nome: `add_mfa_support`
3. Copie o conteúdo de `supabase/migrations/20250110000000_add_mfa_support.sql`
4. Clique em "Run"

---

#### Verificar se Vector foi aplicada:

**Opção 1: Via SQL Editor**
```sql
-- 1. Verificar extensão vector
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 2. Verificar coluna embedding em exercises
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'exercises'
  AND column_name = 'embedding';

-- 3. Verificar índice HNSW
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'exercises'
  AND indexname LIKE '%embedding%';
```

**Esperado:**
```sql
-- Query 1: Extensão vector
extname | installed
--------|-----------
vector  | true

-- Query 2: Coluna embedding
column_name | data_type | udt_name
------------|-----------|----------
embedding   | user-defined| vector

-- Query 3: Índice HNSW
indexname                   | indexdef
----------------------------|----------
exercises_embedding_idx     | CREATE INDEX exercises_embedding_idx...
```

**Opção 2: Via Extensions**
1. Database → Extensions
2. Procure por `vector`
3. Deve estar com checkbox marcado

**Se NÃO existirem:** Aplique a migration
1. Database → Migrations → New Migration
2. Nome: `enable_vector`
3. Copie o conteúdo de `supabase/migrations/20250110120000_enable_vector.sql`
4. Clique em "Run"

---

### 3️⃣ Gerar Embeddings

**Se a migration Vector foi aplicada, gere os embeddings:**

```bash
# 1. Instalar tsx se necessário
pnpm add -D tsx

# 2. Executar script
npx tsx scripts/generate-embeddings.ts
```

**Isso vai:**
- Gerar embeddings para todos os exercícios
- Gerar embeddings para todos os protocolos
- Demorar 2-5 minutos
- Custar ~$0.01-0.10

**Verificar se embeddings foram gerados:**

Via SQL Editor:
```sql
-- Contar exercícios com embeddings
SELECT
  COUNT(*) as total_exercises,
  COUNT(embedding) as exercises_with_embeddings,
  ROUND(COUNT(embedding)::numeric / COUNT(*) * 100, 2) as percentage
FROM exercises;
```

**Esperado:** `percentage` deve ser > 90%

---

## 📊 Checklist Final

### Local (100% ✅)
- [x] .env.local configurado
- [x] Variáveis KV locais
- [x] Feature flags locais
- [x] OPENAI_API_KEY local
- [x] CRON_SECRET local
- [x] Runtime migration completa
- [x] Migrations criadas

### Vercel Dashboard
- [ ] Variáveis KV adicionadas
- [ ] OPENAI_API_KEY adicionada
- [ ] CRON_SECRET adicionado

### Supabase
- [ ] Migration MFA aplicada
- [ ] Migration Vector aplicada
- [ ] Embeddings gerados

### Deploy
- [ ] Deploy para produção
- [ ] Testar KV cache
- [ ] Testar feature flags
- [ ] Testar busca semântica
- [ ] Testar MFA
- [ ] Verificar cron jobs nos logs

---

## 🧪 Testes Rápidos

### 1. Testar KV Cache

```typescript
// Em qualquer componente ou página
import { PatientCache } from '@/lib/cache/KVCacheService';

// Testar
const patient = await PatientCache.get('patient-id-123');
console.log('Cache funcionando:', patient);
```

### 2. Testar Feature Flags

```typescript
import { isFeatureEnabledFromEnv } from '@/lib/featureFlags/envFlags';

const enabled = isFeatureEnabledFromEnv('ai_transcription');
console.log('AI Transcription habilitado:', enabled); // true
```

### 3. Testar Busca Semântica

```typescript
import { exerciseEmbedding } from '@/lib/vector/embeddings';

// Depois de gerar embeddings
const results = await exerciseEmbedding.searchExercises(
  'exercícios para dor lombar',
  { threshold: 0.75, limit: 10 }
);

console.log('Resultados:', results);
```

---

## 🚀 Deploy para Produção

**Após tudo verificado:**

```bash
# 1. Commit das mudanças
git add .
git commit -m "feat: complete Pro integrations setup

- Upstash KV configured
- Feature flags via ENV
- Supabase Vector and MFA migrations
- Runtime migration to Node.js
- Cron jobs with CRON_SECRET
- OpenAI embeddings ready

🤖 Generated with Claude Code"

# 2. Push
git push origin main

# 3. Deploy manual (se necessário)
vercel --prod
```

---

## 📈 Esperado Após Setup Completo

- ⚡ **70-80% cache hit rate** com KV
- 🚩 **Feature flags instantâneos** via ENV
- 🔍 **Busca semântica** funcionando
- 🔐 **MFA disponível** para admins
- ⏰ **5 cron jobs** executando
- 🔄 **Preview deployments** automáticos

---

## 💬 Precisa de Ajuda?

- **Vercel Dashboard**: https://vercel.com/rafael-minattos-projects
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu
- **Todo Checklist**: `TODO_CHECKLIST.md`
- **Quick Start**: `QUICKSTART.md`
- **Guia Completo**: `INTEGRATIONS_GUIDE.md`

---

**Status Local: ✅ 100% COMPLETO**
**Falta: Verificações manuais + Deploy**
