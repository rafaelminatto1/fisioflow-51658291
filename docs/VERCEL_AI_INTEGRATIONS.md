# Integrações Vercel AI e Observabilidade

## Visão Geral

O FisioFlow integra o ecossistema Vercel para fornecer recursos avançados de IA, analytics e observabilidade.

## Tecnologias Integradas

### 1. Vercel AI SDK (`ai` + `@ai-sdk/react`)

**Versão**: 6.0.33

**Recursos**:
- Streaming de respostas de IA em tempo real
- Suporte a múltiplos providers (OpenAI, Google Gemini)
- Hooks React otimizados (`useChat`, `useCompletion`)
- Type-safe com TypeScript

**Instalação**:
```bash
pnpm add ai @ai-sdk/openai @ai-sdk/google @ai-sdk/react
```

### 2. Sentry React (`@sentry/react`)

**Versão**: 10.32.1

**Recursos**:
- Rastreamento de erros em tempo real
- Performance monitoring com tracing
- Session replay para debugging
- Release tracking

**Configuração**: `src/lib/sentry/config.ts`

### 3. Vercel Analytics (`@vercel/analytics`)

**Versão**: 1.6.1

**Recursos**:
- Web analytics privacy-friendly
- Page views automáticos
- Custom events

### 4. Vercel Speed Insights (`@vercel/speed-insights`)

**Versão**: 1.3.1

**Recursos**:
- Core Web Vitals tracking
- Real User Monitoring (RUM)
- Performance insights

## Componentes de IA

### AI Assistant Panel

**Arquivo**: `src/components/patients/analytics/AIAssistantPanel.tsx`

Painel de chat com IA para análise de pacientes:

```typescript
import { AIAssistantPanel, AIAssistantMini } from '@/components/patients/analytics';

<AIAssistantPanel
  patientId={patientId}
  patientName={patientName}
/>
```

**Funcionalidades**:
- Chat conversacional com histórico
- Ações rápidas (Progresso, Riscos, Recomendações, Predições)
- Aba de Insights com análise clínica gerada
- Streaming de respostas em tempo real

### AI Treatment Recommendations

**Arquivo**: `src/components/patients/analytics/AITreatmentRecommendations.tsx`

Geração de planos de tratamento personalizados:

```typescript
import { AITreatmentRecommendations } from '@/components/patients/analytics';

<AITreatmentRecommendations
  patientId={patientId}
  patientName={patientName}
  diagnosis="Lombalgia crônica"
  primaryComplaint="Dor lombar há 3 meses"
  sessionCount={6}
  onPrint={() => console.log('Print')}
/>
```

**Seções Geradas**:
1. Objetivos do tratamento (curto/médio prazo)
2. Intervenções propostas (técnicas, exercícios)
3. Frequência e duração sugeridas
4. Critérios de alta

## Hooks de IA

### useAIInsights

Gera insights clínicos com streaming:

```typescript
import { useAIInsights } from '@/hooks/useAIInsights';

const insights = useAIInsights({
  patientId,
  patientName,
  analyticsData,
  language: 'pt-BR',
});

// Gerar insights
insights.generate();

// Resposta com streaming
const { completion, isGenerating } = insights;
```

### useAITreatmentRecommendations

Gera recomendações de tratamento:

```typescript
import { useAITreatmentRecommendations } from '@/hooks/useAIInsights';

const recommendations = useAITreatmentRecommendations({
  patientId,
  patientName,
  diagnosis: 'Lombalgia',
  primaryComplaint: 'Dor ao sentar',
  sessionCount: 4,
});

recommendations.generate();
```

### useAIPatientAssistant

Chat assistant para análise de pacientes:

```typescript
import { useAIPatientAssistant } from '@/hooks/useAIInsights';

const assistant = useAIPatientAssistant(patientId, patientName);

// Ações rápidas
assistant.askAboutProgress();
assistant.askAboutRisks();
assistant.askAboutRecommendations();

// Mensagens customizadas
assistant.append({
  role: 'user',
  content: 'Qual o prognóstico?',
});
```

## API Routes

### `/api/ai/insights`

**Método**: POST

**Descrição**: Gera insights clínicos com streaming

**Body**:
```json
{
  "prompt": "Analise o paciente...",
  "patientId": "uuid",
  "patientName": "João Silva",
  "language": "pt-BR",
  "model": "openai"
}
```

**Response**: Stream de texto (AI SDK stream)

### `/api/ai/chat/v2`

**Método**: POST

**Descrição**: Chat endpoint para useChat

**Body**:
```json
{
  "messages": [
    { "role": "user", "content": "Olá!" }
  ],
  "patientId": "uuid",
  "patientName": "João Silva",
  "language": "pt-BR"
}
```

**Response**: Data stream (AI SDK data stream)

### `/api/ai/recommendations`

**Método**: POST

**Descrição**: Gera plano de tratamento

**Body**:
```json
{
  "prompt": "Sugira tratamento para...",
  "patientId": "uuid",
  "patientName": "João Silva",
  "diagnosis": "Lombalgia",
  "primaryComplaint": "Dor lombar",
  "sessionCount": 6
}
```

## Configuração de Variáveis de Ambiente

### OpenAI

```bash
# .env.local
OPENAI_API_KEY=sk-...
```

### Google Gemini

```bash
# .env.local
GOOGLE_API_KEY=...
```

### Sentry

```bash
# .env.local
VITE_SENTRY_DSN=https://...
VITE_APP_VERSION=1.0.0
```

## Modelos Suportados

| Provider | Modelo | Uso |
|----------|--------|-----|
| OpenAI | gpt-4o-mini | Chat, Insights, Recomendações |
| Google | gemini-1.5-flash-latest | Chat, Insights, Recomendações |

## Melhores Práticas

### Prompts Clínicos

- Sempre incluir contexto do paciente
- Especificar idioma desejado
- Pedir respostas em formato markdown
- Incluir avisos sobre validação profissional

### Tratamento de Erros

```typescript
const insights = useAIInsights({...});

insights.onError = (error) => {
  console.error('[AI Insights]', error);
  toast.error('Erro ao gerar insights');
  // Enviar para Sentry
  Sentry.captureException(error);
};
```

### Rate Limiting

As requisições para APIs de IA devem ter rate limiting:

```typescript
// Use exponential backoff
const retryWithBackoff = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
};
```

## Integração com Vercel

### Deploy no Vercel

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Environment Variables no Vercel

1. Acesse o projeto no Vercel Dashboard
2. Settings → Environment Variables
3. Adicione as variáveis:
   - `OPENAI_API_KEY`
   - `GOOGLE_API_KEY`
   - `VITE_SENTRY_DSN`

## Troubleshooting

### Erro: "AI SDK stream not working"

Verifique se:
1. O endpoint da API está retornando stream corretamente
2. O `content-type` está correto
3. Não há middleware modificando a response

### Erro: "Sentry not capturing errors"

Verifique:
1. `VITE_SENTRY_DSN` está configurado
2. `initSentry()` está sendo chamado antes do render
3. O release está configurado corretamente

### Performance lenta no streaming

Soluções:
1. Use modelo mais rápido (gpt-4o-mini ao invés de gpt-4o)
2. Reduza `maxTokens`
3. Implemente cache para prompts repetidos

## Roadmap

### Short-term
- [ ] Adicionar suporte para Claude (Anthropic)
- [ ] Implementar cache de respostas com Vercel KV
- [ ] Adicionar mais idiomas

### Medium-term
- [ ] Fine-tuning de modelo para fisioterapia
- [ ] Integração com Vercel AI Gateway
- [ ] RAG com conhecimento clínico

### Long-term
- [ ] Modelos especializados por patologia
- [ ] Multi-modalidade (imagens, vídeos)
- [ ] Agentes autônomos para triagem
