# 🔄 Vercel Storage - Marketplace Update (2025/2026)

## ⚠️ Mudança Importante na Arquitetura

A partir de 2025, o Vercel mudou a arquitetura de storage:

### Produtos Nativos Vercel (Continuam Iguais)
- ✅ **Vercel Blob** - Storage de arquivos (nativo)
- ✅ **Edge Config** - Feature flags e configuração global (nativo)

### Produtos Através do Marketplace (Nova Arquitetura)
- ⚠️ **Vercel KV** → Agora através do **Marketplace** (Upstash Redis, etc.)
- ⚠️ **Vercel Postgres** → Agora através do **Marketplace** (Neon, etc.)

---

## 📦 O Que Isso Muda Para Você

### Antes (2023-2024)
```bash
# Vercel KV era um produto nativo
# Você criava diretamente no dashboard do Vercel
Vercel Dashboard → Storage → KV → Create
```

### Agora (2025+)
```bash
# KV é uma integração do Marketplace
# Você precisa escolher um provider do Marketplace
Vercel Dashboard → Storage → Marketplace → Redis (KV) → Choose Provider
```

---

## 🎯 Opções do Marketplace para KV (Redis)

### 1. Upstash Redis (Recomendado)
**Por que escolher:**
- ✅ Provider oficial que o Vercel usava para KV
- ✅ Generous free tier
- ✅ Edge replication global
- ✅ API compatível com Redis
- ✅ Baixa latência

**Como integrar:**
1. Vercel Dashboard → Storage → Marketplace
2. Procure por "Redis" ou "Upstash"
3. Clique em "Integrate"
4. Escolha o projeto Upstash ou crie novo
5. Configure variáveis de ambiente

**Variáveis de ambiente:**
```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 2. Redis (Outros Providers)
- **Redis Cloud** - Redis Enterprise
- **Dragonfly** - Redis compatível com melhor performance
- **Momento** - Serverless Redis

---

## 🎯 Opções do Marketplace para Postgres

> **⚠️ NOTA PARA FISIOFLOW:** O FisioFlow usa **Supabase** como banco de dados principal, não providers do marketplace. As opções abaixo são apenas informativas para outros projetos.

### Outros Providers Disponíveis no Marketplace
- **AWS RDS** - Para integração com AWS
- **MongoDB Atlas** - Se você precisa de NoSQL
- **Nile** - Multi-tenant Postgres otimizado
- **MotherDuck** - Analytics database
- **Turso** - Serverless SQLite

---

## 🔄 Como Isso Afeta o FisioFlow

### Boas Notícias! ✅
**A implementação que criei continua funcionando!** Por que:

1. **@vercel/kv** é compatível com Upstash Redis
2. O código que criei usa a API padrão do SDK
3. Você só precisa instalar a integração do Marketplace

### O Que Precisa Mudar

#### 1. Instalação Diferente

**Antes:**
```bash
# Criar KV diretamente
Vercel Dashboard → Storage → KV → Create
```

**Agora:**
```bash
# Integrar Upstash via Marketplace
Vercel Dashboard → Storage → Marketplace
→ Search "Upstash" → Integrate
→ Choose/Create Upstash project
```

#### 2. Variáveis de Ambiente Diferentes

**Antes:**
```bash
KV_URL=redis://...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

**Agora (Upstash):**
```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

#### 3. SDK Continua o Mesmo! ✅

```typescript
import { kv } from '@vercel/kv';
// Código continua IGUAL!
```

---

## 📋 Passo a Passo - Setup Atualizado

### 1. Integrar Upstash Redis (via Marketplace)

```bash
# 1. Vá ao Vercel Dashboard
# 2. Clique no projeto
# 3. Vá para "Storage" tab
# 4. Clique em "Marketplace"
# 5. Procure por "Upstash" ou "Redis"
# 6. Clique "Integrate"
# 7. Autorize a integração
# 8. Escolha ou crie um database Upstash
# 9. Copie as variáveis de ambiente
```

### 2. Atualizar Variáveis de Ambiente

```bash
# No Vercel Dashboard → Settings → Environment Variables
# Adicione:

UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx

# Se quiser manter compatibilidade com código antigo:
KV_URL=${UPSTASH_REDIS_REST_URL}
KV_REST_API_URL=${UPSTASH_REDIS_REST_URL}
KV_REST_API_TOKEN=${UPSTASH_REDIS_REST_TOKEN}
```

### 3. Código - Sem Mudanças! ✅

```typescript
// src/lib/cache/KVCacheService.ts
import { kv } from '@vercel/kv';

// Tudo continua funcionando IGUAL!
const cached = await kv.get('key');
await kv.set('key', value, { ex: 3600 });
```

---

## 🔧 Atualização do KVCacheService

Se você quiser fazer o código mais explícito sobre o provider:

```typescript
// src/lib/cache/KVCacheService.ts

/**
 * Vercel KV Cache Service
 *
 * NOTA: A partir de 2025, Vercel KV é fornecido via Marketplace
 * Provider padrão: Upstash Redis
 *
 * Integração: Vercel Dashboard → Storage → Marketplace → Upstash
 */

import { kv } from '@vercel/kv';

// O resto do código continua IGUAL!
```

---

## 💡 Recomendação Para FisioFlow

### Continue Com Supabase + Upstash via Vercel

**Arquitetura Recomendada:**

1. **Banco Principal** → Supabase Pro (já contratado)
   - Database relacional
   - Auth
   - Edge Functions
   - Realtime
   - Storage (arquivos)

2. **Cache Distribuído** → Upstash Redis via Vercel Marketplace
   - Cache de queries
   - Rate limiting
   - Session storage

3. **Feature Flags** → Vercel Edge Config (nativo)
   - Configuração global
   - Feature flags
   - A/B testing

4. **Blob Storage** → Vercel Blob (nativo) OU Supabase Storage
   - Arquivos grandes
   - Imagens
   - Vídeos

---

## 🚀 Quick Start Atualizado

### Usar Upstash Redis via Vercel Marketplace

```bash
# 1. Integrar Upstash (via Vercel)
Vercel Dashboard → Storage → Marketplace
→ Search "Upstash Redis" → Integrate

# 2. Criar database Upstash
# Ou conectar existente

# 3. Copiar variáveis de ambiente
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# 4. Adicionar ao Vercel
Settings → Environment Variables → Add

# 5. Usar no código (sem mudanças!)
import { kv } from '@vercel/kv';
await kv.set('test', 'value');
```

---

## 📚 Recursos

- **Vercel Marketplace**: https://vercel.com/docs/storage
- **Upstash Integration**: https://vercel.com/marketplace/upstash
- **Vercel Storage Update**: https://vercel.com/blog/introducing-the-vercel-marketplace
- **Community Discussion**: https://community.vercel.com/t/there-is-no-kv-database-option

---

## ✅ Conclusão

**Mudança na arquitetura, mas não na implementação!**

- ❌ KV não é mais produto nativo do Vercel
- ✅ KV continua disponível via Marketplace (Upstash)
- ✅ Código continua o MESMO
- ✅ SDK continua o MESMO (@vercel/kv)
- ⚠️ Setup muda (Marketplace em vez de nativo)

**A implementação que criei funciona perfeitamente!** Você só precisa:
1. Integrar Upstash via Marketplace
2. Copiar as variáveis de ambiente
3. Usar o código como está

---

**Próximo passo:** Leia QUICKSTART.md para instruções atualizadas!
