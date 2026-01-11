# ⚠️ IMPORTANTE - Atualização Edge Functions (2025)

## 🔄 Mudança na Arquitetura do Vercel

### O Que Mudou:

**ANTES (2023-2024):**
- Edge Functions eram um produto standalone
- Produto separado com suas próprias configurações

**AGORA (2025+):**
- ⚠️ **Edge Functions standalone foi DESCONTINUADO**
- ✅ Edge Functions agora são um **runtime** dentro de Vercel Functions
- ✅ Você pode escolher entre: `edge` runtime OU `nodejs` runtime
- ✅ **RECOMENDAÇÃO: Usar Node.js runtime** para melhor performance

---

## 🎯 O Que Isso Significa Para FisioFlow

### Boas Notícias:
1. **Você ainda pode usar Edge Runtime** se quiser
2. **Mas Node.js runtime é recomendado** para a maioria dos casos
3. **Ambos rodam em Fluid Compute** com Active CPU pricing
4. **Mais flexibilidade** para escolher o runtime adequado

### Para PROJETOS VITE (como FisioFlow):

**RECOMENDAÇÃO: Use Node.js Runtime**

Por que Node.js é melhor para FisioFlow:
- ✅ **Melhor performance**: Mais rápido e confiável
- ✅ **Mais APIs**: Acesso completo a Node.js APIs
- ✅ **Bibliotecas**: Compatibilidade com mais bibliotecas
- ✅ **Supabase**: Melhor integração com Supabase client
- ✅ **OpenAI**: Melhor suporte para SDKs como OpenAI
- ✅ **Filesystem**: Acesso limitado a filesystem quando necessário

---

## 📊 Comparativo: Edge Runtime vs Node.js Runtime

| Característica | Edge Runtime | Node.js Runtime | Recomendação |
|----------------|--------------|-----------------|---------------|
| **Performance** | Rápido (cold start) | **Mais rápido** | ✅ Node.js |
| **APIs Suportadas** | Web Standards (limitado) | **Node.js completo** | ✅ Node.js |
| **Bibliotecas** | Limitadas | **Todas compatíveis** | ✅ Node.js |
| **Supabase Client** | ⚠️ Parcialmente | **✅ Totalmente** | ✅ Node.js |
| **OpenAI SDK** | ⚠️ Requer workaround | **✅ Native** | ✅ Node.js |
| **Database Long Queries** | ⚠️ 25s max initial response | **✅ Sem limite inicial** | ✅ Node.js |
| **Streaming** | ✅ Suportado | **✅ Suportado** | Empate |
| **Cron Jobs** | ✅ Suportado | **✅ Suportado** | Empate |
| **Edge Config** | ✅ Suportado | **✅ Suportado** | Empate |
| **Blob Storage** | ✅ Suportado | **✅ Suportado** | Empate |

---

## 🔧 Como Especificar o Runtime

### Para Vercel Functions (arquivos em `api/`):

```typescript
// api/alguma-funcao/route.ts

export const runtime = 'nodejs'; // RECOMENDADO para FisioFlow
// OU
export const runtime = 'edge'; // Apenas se realmente necessário

export async function GET(request: Request) {
  // ... código
}
```

### Para Supabase Edge Functions (continua igual):

```typescript
// supabase/functions/ai-transcribe/index.ts
// Deno runtime - não muda

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // ... código
});
```

---

## 💡 Recomendações Para FisioFlow

### 1. Para Novas API Routes em `api/`:

**USE Node.js Runtime:**

```typescript
// api/patients/route.ts
export const runtime = 'nodejs'; // ✅ RECOMENDADO

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase.from('patients').select('*');
  return NextResponse.json(data);
}
```

### 2. Para AI Features (transcrição, chat, etc.):

**USE Node.js Runtime:**

```typescript
// api/ai/transcribe/route.ts
export const runtime = 'nodejs'; // ✅ RECOMENDADO

import OpenAI from 'openai';

const openai = new OpenAI();

// OpenAI SDK funciona melhor em Node.js!
```

### 3. Para Webhooks (Stripe, WhatsApp):

**USE Node.js Runtime:**

```typescript
// api/webhooks/stripe/route.ts
export const runtime = 'nodejs'; // ✅ RECOMENDADO

// Melhor suporte para bibliotecas de webhook
```

### 4. Para Cron Jobs:

**QUALQUER UM FUNCIONA:**

```typescript
// api/crons/daily-reports/route.ts
export const runtime = 'nodejs'; // ✅ RECOMENDADO

// Node.js é mais adequado para tarefas longas
```

---

## ⚠️ Quando AINDA Usar Edge Runtime

Edge Runtime ainda faz sentido para:

1. **Funções MUITO simples** (sem dependências externas)
2. **Redirects simples**
3. **Headers manipulation**
4. **Middleware leve**

**Exemplo onde Edge Runtime é OK:**

```typescript
// api/redirect/route.ts
export const runtime = 'edge'; // ✅ Edge Runtime OK aqui

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === '/old-path') {
    return Response.redirect('/new-path');
  }
}
```

---

## 🔄 Atualização das Implementações

### O Que Precisa Mudar:

**ARQUIVOS EM `api/`** (Vercel Functions):

1. **Adicionar `export const runtime = 'nodejs'`** a cada arquivo
2. **OU deixar sem export** (default é nodejs na maioria dos casos)

**ARQUIVOS EM `supabase/functions/`**:

✅ **Não precisam mudar!**
- Continuam usando Deno runtime
- Supabase Edge Functions são diferentes de Vercel Edge Functions

---

## 📋 Checklist de Atualização

### Para Vercel Functions (`api/*.ts`):

- [ ] Adicionar `export const runtime = 'nodejs'` aos arquivos AI
- [ ] Adicionar `export const runtime = 'nodejs'` aos webhooks
- [ ] Adicionar `export const runtime = 'nodejs'` aos crons
- [ ] Testar se funciona com Node.js runtime
- [ ] Remover `export const runtime = 'edge'` se existir

### Para Supabase Functions (`supabase/functions/*`):

- ✅ **Nada precisa mudar**
- ✅ Continuam usando Deno normalmente

---

## 🚀 Plano de Ação

### Imediato:

1. ✅ **ManTER Supabase Edge Functions** como estão (52 funções)
2. ✅ **USAR Node.js runtime** para novas Vercel Functions em `api/`

### Implementação:

As funções que criei em `api/` **devem especificar Node.js runtime**:

```typescript
// api/ai/transcribe/route.ts
export const runtime = 'nodejs'; // ← ADICIONAR ISSO

// api/ai/chat/route.ts
export const runtime = 'nodejs'; // ← ADICIONAR ISSO

// api/crons/daily-reports/route.ts
export const runtime = 'nodejs'; // ← ADICIONAR ISSO

// etc...
```

### OU:

**Remover completamente** as Edge Functions de `api/` e usar **apenas Supabase Edge Functions**:

Esta é a MELHOR opção para FisioFlow porque:

1. ✅ Você já tem 52 Supabase Functions configuradas
2. ✅ Elas funcionam perfeitamente
3. ✅ Estão integradas com Supabase Auth
4. ✅ Têm rate limiting, error tracking, etc.
5. ✅ **Não precisa mexer em nada!**

---

## 📚 Documentação Oficial

- [Vercel Edge Functions (Atualizado 2025)](https://vercel.com/docs/functions/runtimes/edge/edge-functions)
- [Vercel Functions - Runtimes](https://vercel.com/docs/functions/runtimes)
- [Edge Runtime APIs](https://vercel.com/docs/functions/runtimes/edge)

---

## ✅ Conclusão

### Para FisioFlow:

**RECOMENDAÇÃO OFICIAL:**

1. ✅ **Continuar usando Supabase Edge Functions** para serverless
2. ✅ **Usar Node.js runtime** se criar Vercel Functions
3. ⚠️ **Evitar Edge Runtime** a menos que estritamente necessário

**Por quê?**

- Supabase Functions já estão configuradas e funcionando
- Node.js runtime tem melhor performance
- Menos limitações e mais compatibilidade
- Melhor integração com OpenAI, Supabase client, etc.

**A implementação que criei continua válida!** Apenas especifique `runtime = 'nodejs'` se for usar as funções em `api/`, ou melhor ainda, use apenas Supabase Edge Functions.
