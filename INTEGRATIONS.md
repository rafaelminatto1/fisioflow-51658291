# FisioFlow - Guia de Integrações

## 📋 Índice

1. [Serviços AI (Google Gemini + xAI Grok)](#serviços-ai)
2. [ElevenLabs (Voice)](#elevenlabs-voice)
3. [Vercel AI Gateway](#vercel-ai-gateway)
4. [Feature Flags (Statsig/Hypertune)](#feature-flags)
5. [Monitoramento (Sentry)](#monitoramento-sentry)

---

## 🤖 Serviços AI

### Estratégia Multi-Provider: Google Gemini + xAI Grok

| Serviço | Uso | Custo | Como Obter |
|---------|-----|-------|------------|
| **Google Gemini** | Tarefas simples (SOAP, sugestões) | GRÁTIS | [AI Studio](https://aistudio.google.com/app/apikey) |
| **xAI Grok** | Raciocínio clínico complexo | GRÁTIS via Vercel | [xAI Console](https://console.x.ai/) |
| **OpenAI** | Backup automático | $2.50/1M tokens | [Platform](https://platform.openai.com/api-keys) |
| **Anthropic** | Backup automático | $3.00/1M tokens | [Console](https://console.anthropic.com/settings/keys) |

### Google Gemini API Key

1. Acessar [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Fazer login com conta Google
3. Clicar em "Create API Key"
4. Copiar a chave

```bash
# Adicionar ao .env
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
GOOGLE_AI_API_KEY=AIzaSy...  # Alternativa
```

### xAI (Grok) API Key

1. Acessar [xAI Console](https://console.x.ai/)
2. Criar conta ou fazer login
3. Navegar para API Keys
4. Criar nova chave

```bash
# Adicionar ao .env
XAI_API_KEY=xai-...
```

### OpenAI API Key

1. Acessar [OpenAI Platform](https://platform.openai.com/api-keys)
2. Fazer login
3. Clicar em "Create new secret key"
4. Copiar a chave (ela só aparece uma vez!)

```bash
# Adicionar ao .env
OPENAI_API_KEY=sk-proj-...
```

### Anthropic API Key

1. Acessar [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Fazer login
3. Criar API Key

```bash
# Adicionar ao .env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🎙️ ElevenLabs (Voice)

### Por que ElevenLabs?

- **Vozes PT-BR nativas**: Marcela, Carlos, Antônio
- **Qualidade premium**: +40% engajamento dos pacientes
- **Preço competitivo**: $5-22/mês

### Concorrentes

| Serviço | PT-BR | Custo | Quando Usar |
|---------|-------|-------|-------------|
| **ElevenLabs** | ⭐⭐⭐⭐⭐ | $5-22/mês | **Recomendado** |
| Deepgram | ⭐⭐⭐⭐ | $0.006/1k chars | Alto volume |
| OpenAI TTS | ⭐⭐⭐ | $15-30/mês | Já tem chave |
| Google TTS | ⭐⭐ | $4/mês | Orçamento mínimo |

### Obter API Key

1. Acessar [ElevenLabs](https://elevenlabs.io/)
2. Criar conta (grátis para teste)
3. Dashboard → **Developers** (menu inferior esquerdo)
4. **API Keys** → Clicar **Create**
5. Copiar a chave (formato: `xi-api-...`)

```bash
# Adicionar ao .env
ELEVENLABS_API_KEY=xi-your-api-key-here

# Vozes em Português (opcional - já está no código)
ELEVENLABS_VOICE_ID_marcela=NhTgj9YQTV8TfbE4XEU  # Feminina - amigável
ELEVENLABS_VOICE_ID_carlos=OQx5BnUzQ6CJhKoJAYf  # Masculina - autoritária
```

### Planos ElevenLabs

| Plano | Custo | Caracteres | ~Exercícios |
|-------|-------|-----------|-------------|
| **Free** | $0 | 10.000/mês | ~15 |
| **Starter** | $5/mês | 30.000/mês | ~50 |
| **Creator** | $22/mês | 100.000/mês | ~170 |

### Testar ElevenLabs

```bash
# No terminal do projeto
npm run dev

# No navegador console
import { checkElevenLabsHealth } from '@/lib/voice/elevenlabs-service';

const health = await checkElevenLabsHealth();
console.log(health);
// { configured: true, healthy: true, voicesAvailable: 600+ }
```

---

## 🌐 Vercel AI Gateway

### Benefícios

- **$5 crédito/mês** em uso de AI
- **Roteamento automático** para providers mais baratos
- **Rate limiting** integrado
- **Analytics** de uso

### Configuração

1. Dashboard Vercel → Marketplace
2. Instalar **Vercel AI Gateway**
3. Copiar API Key

```bash
# Adicionar ao .env
VERCEL_AI_GATEWAY_URL=https://gateway.vercel.sh/api/v1
VERCEL_AI_GATEWAY_KEY=vk-...
```

---

## 🚩 Feature Flags

### Statsig (Recomendado)

- **Grátis**: Unlimited flags + 1M eventos/mês
- [Signup](https://www.statsig.com/)

```bash
# Adicionar ao .env
NEXT_PUBLIC_STATSIG_CLIENT_KEY=your-client-key
STATSIG_SERVER_SECRET=your-server-secret
```

### Hypertune (Alternativa)

- [Signup](https://hypertune.com/)

```bash
# Adicionar ao .env
VITE_HYPERTUNE_API_KEY=your-api-key
```

---

## 📊 Monitoramento (Sentry)

### Configuração

1. Acessar [Sentry.io](https://sentry.io/)
2. Criar projeto → "Vite" ou "React"
3. Copiar DSN

```bash
# Adicionar ao .env
VITE_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

### Features Habilitadas

- ✅ Error tracking
- ✅ Performance monitoring
- ✅ Session replay
- ✅ User feedback

---

## 🔍 Verificar Configuração

### Script de Diagnóstico

```typescript
// src/lib/integrations/diagnostics.ts
export async function checkAllIntegrations() {
  const results = {
    ai: {
      google: !!import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY,
      xai: !!import.meta.env.VITE_XAI_API_KEY,
      openai: !!import.meta.env.VITE_OPENAI_API_KEY,
      anthropic: !!import.meta.env.VITE_ANTHROPIC_API_KEY,
    },
    voice: {
      elevenlabs: !!import.meta.env.VITE_ELEVENLABS_API_KEY,
    },
    gateway: {
      vercel: !!import.meta.env.VITE_VERCEL_AI_GATEWAY_KEY,
    },
  };

  console.table(results);
  return results;
}
```

### Usar no Console do Navegador

```javascript
// No console
await import('/src/lib/integrations/diagnostics.ts').then(m => m.checkAllIntegrations());
```

---

## 📝 Checklist de Implementação

### Fase 1: Setup Básico

- [ ] Google Gemini API Key
- [ ] xAI Grok API Key
- [ ] Testar AI Gateway
- [ ] ElevenLabs API Key

### Fase 2: Implementação

- [ ] Habilitar feature flags
- [ ] Configurar Sentry
- [ ] Testar voice instructions
- [ ] Implementar fallback AI

### Fase 3: Produção

- [ ] Configurar Vercel Environment Variables
- [ ] Testar health checks
- [ ] Monitorar custos
- [ ] Documentar para equipe

---

## 🆘 Troubleshooting

### ElevenLabs: "API key not configured"

```bash
# Verificar se a variável está com prefixo VITE_
echo $VITE_ELEVENLABS_API_KEY

# Reiniciar o dev server
npm run dev
```

### AI Gateway: "Unauthorized"

```bash
# Verificar a chave do Vercel AI Gateway
# Deve começar com "vk-"
```

### Feature Flags não funcionando

```typescript
// Verificar se o provider está correto
import { featureFlagsService } from '@/lib/features/FeatureFlagsService';

await featureFlagsService.initialize({ provider: 'local' });
```

---

## 📚 Recursos Úteis

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [ElevenLabs Docs](https://elevenlabs.io/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [xAI Docs](https://docs.x.ai/)
- [Sentry Docs](https://docs.sentry.io/)
