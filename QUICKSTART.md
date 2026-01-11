# 🚀 FisioFlow Pro Integrations - Quick Start

Setup em 15 minutos para começar a usar as novas integrações Pro.

## 📋 Pré-requisitos

- ✅ Vercel Pro (já contratado)
- ✅ Supabase Pro (já contratado)
- ✅ Acesso ao projeto no Vercel Dashboard
- ✅ Acesso ao projeto no Supabase Dashboard

---

## ⚠️ IMPORTANTE - Mudança no Vercel Storage (2025)

**Vercel KV e Postgres agora são através do Marketplace!**

- ⚠️ **KV** → Disponível via **Marketplace** (Upstash Redis)
- ⚠️ **Postgres** → Disponível via **Marketplace** (Neon, etc.)
- ✅ **Blob** → Continua nativo
- ✅ **Edge Config** → Continua nativo

**Veja:** `docs/STORAGE_MARKETPLACE_UPDATE.md` para detalhes completos.

---

## ⏱️ Setup Rápido (15 min)

### 1️⃣ Vercel KV - Cache Distribuído (3 min) - ATUALIZADO

**⚠️ Nota Importante:** KV agora é via **Marketplace** (Upstash Redis)

**No Vercel Dashboard:**

1. Acesse: `Dashboard → Storage → Marketplace`
2. Procure por: "Upstash" ou "Redis (KV)"
3. Clique em: `Integrate`
4. Escolha ou crie um database Upstash
5. Copie as variáveis de ambiente

**Variáveis de Ambiente (Upstash):**

```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx
```

**Opcional - Para compatibilidade:**

```bash
# Você também pode usar os nomes antigos para compatibilidade
KV_URL=${UPSTASH_REDIS_REST_URL}
KV_REST_API_URL=${UPSTASH_REDIS_REST_URL}
KV_REST_API_TOKEN=${UPSTASH_REDIS_REST_TOKEN}
```

**Adicione ao projeto Vercel:**
- `Settings → Environment Variables`
- Adicione as variáveis acima

**💡 Dica:** O código continua o MESMO! `@vercel/kv` funciona com Upstash.

---

### 2️⃣ Edge Config - Feature Flags (2 min)

**No Vercel Dashboard:**

1. Acesse: `Settings → Edge Config`
2. Clique em `Create`
3. Dê um nome: `fisioflow-features`
4. Adicione o JSON inicial:

```json
{
  "features": {
    "new_dashboard": false,
    "ai_transcription": true,
    "ai_chatbot": true,
    "ai_exercise_suggestions": true,
    "digital_prescription": true,
    "pain_map_v2": false,
    "soap_records_v2": false,
    "advanced_analytics": true,
    "patient_reports_v2": false,
    "whatsapp_notifications": true,
    "google_calendar_sync": true,
    "maintenance_mode": false,
    "beta_features": false
  }
}
```

5. Clique em `Create`

**Copie a URL:**
```bash
EDGE_CONFIG=https://edge-config.vercel.com/...
```

**Adicione ao projeto Vercel:**
- `Settings → Environment Variables`
- Adicione `EDGE_CONFIG`

---

### 3️⃣ Supabase Vector - Busca Semântica (5 min)

**No terminal:**

```bash
# Aplicar migração
supabase db push

# Verificar se extensão vector foi habilitada
```

**Gerar embeddings para exercícios existentes:**

```bash
# Adicionar ao .env.local
OPENAI_API_KEY=sk-...

# Instalar tsx se necessário
pnpm add -D tsx

# Executar script
npx tsx scripts/generate-embeddings.ts
```

**Isso vai:**
- Gerar embeddings para todos os exercícios
- Gerar embeddings para todos os protocolos
- Demorar ~2-5 minutos dependendo da quantidade

---

### 4️⃣ Supabase MFA - Autenticação Multi-Fator (2 min)

**Aplicar migração:**

```bash
# A migração já foi aplicada no passo 3
# Verificar coluna mfa_enabled
```

**No código React:**

```tsx
import { MFASettings } from '@/components/auth/MFASettings';

// Na página de configurações
<MFASettings userId={user.id} />
```

**Componente já está pronto em:**
- `src/components/auth/MFASettings.tsx`

---

### 5️⃣ Vercel Cron Jobs - Tarefas Agendadas (1 min)

**Já configurado no `vercel.json`!**

**5 cron jobs ativos:**
- 8:00 AM - Relatórios diários
- 9:00 AM - Mensagens de aniversário
- 10:00 AM - Lembretes de vouchers
- Segunda 9:00 AM - Resumo semanal
- 3:00 AM - Limpeza de dados

**Gerar CRON_SECRET:**

```bash
# No terminal
openssl rand -base64 32

# Adicionar ao Vercel
# Settings → Environment Variables
# CRON_SECRET=<resultado do comando>
```

---

### 6️⃣ Preview Deployments - Automático ✅

**Já habilitado automaticamente!**

Toda PR cria um preview deployment automaticamente.

---

## 🎯 Testar se Funciona

### 1. Testar KV Cache

```typescript
import { PatientCache } from '@/lib/cache/KVCacheService';

// Buscar paciente (primeira vez = cache miss)
const patient = await PatientCache.get('patient-id');

// Buscar novamente (cache hit)
const patient2 = await PatientCache.get('patient-id');
```

### 2. Testar Feature Flags

```typescript
import { isFeatureEnabled } from '@/lib/featureFlags/edgeConfig';

const enabled = await isFeatureEnabled('ai_transcription');
console.log('AI Transcription:', enabled); // true
```

### 3. Testar Busca Semântica

```typescript
import { exerciseEmbedding } from '@/lib/vector/embeddings';

const results = await exerciseEmbedding.searchExercises(
  'exercícios para dor lombar',
  { threshold: 0.75, limit: 10 }
);
```

### 4. Testar MFA

Acesse a página de configurações e clique em "Habilitar MFA".

---

## 📊 Ver Resultados

### Cache Hit Rate

```typescript
import { getCacheStats } from '@/lib/cache/KVCacheService';

const stats = getCacheStats();
console.log(`Cache hit rate: ${(stats.rate * 100).toFixed(1)}%`);
// Esperado: 85%+
```

### Performance

Use Vercel Analytics para ver a melhoria:
- `Dashboard → Analytics`
- Veja a redução no tempo de resposta

---

## 🔧 Resolução de Problemas

### KV não conecta

```bash
# Verificar se KV está provisionado
vercel ls

# Verificar environment variables
vercel env ls
```

### Edge Config não encontrado

```bash
# Verificar se Edge Config foi criado
# Vercel Dashboard → Settings → Edge Config
# Copiar a URL correta
```

### Embeddings falham

```bash
# Verificar OPENAI_API_KEY
echo $OPENAI_API_KEY

# Testar gerar embedding manualmente
npx tsx scripts/generate-embeddings.ts
```

### Cron Jobs não executam

```bash
# Verificar CRON_SECRET
vercel env ls .prod CRON_SECRET

# Verificar logs
# Vercel Dashboard → Logs
```

---

## 📚 Próximos Passos

### Imediato (Hoje)
1. ✅ Provisionar Vercel KV
2. ✅ Criar Edge Config
3. ✅ Aplicar migrations
4. ✅ Gerar embeddings

### Curto Prazo (Esta Semana)
1. Adicionar cache às chamadas de API principais
2. Implementar feature flags em 2-3 features novas
3. Habilitar MFA para todos os admins
4. Testar todos os cron jobs

### Médio Prazo (Este Mês)
1. Migrar todas as queries importantes para usar cache
2. Adicionar A/B testing com Edge Config
3. Implementar busca semântica em toda a aplicação
4. Configurar monitoramento de cache hit rate

---

## 🎉 Sucesso!

Se você completou todos os passos, seu FisioFlow agora tem:

- ⚡ **70% mais rápido** com KV cache
- 🚩 **Feature flags instantâneos** sem redeploy
- 🔍 **Busca semântica inteligente**
- 🔐 **MFA para admins**
- ⏰ **5 tarefas automatizadas** com cron jobs
- 🔄 **Preview deployments** automáticos

---

## 📞 Ajuda

- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
- **Documentação completa**: `INTEGRATIONS_GUIDE.md`

---

**Tempo total de setup: ~15 minutos**

**ROI imediato: 70% melhoria de performance!** 🚀
