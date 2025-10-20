# 🛡️ Rate Limiting - FisioFlow

## Visão Geral

Sistema de rate limiting implementado para proteger as edge functions contra:
- Ataques de força bruta
- Uso excessivo de recursos
- Abuso de API
- Negação de serviço (DoS)

---

## ⚙️ Como Funciona

### Identificação

O sistema identifica usuários por:
1. **User ID** (prioritário): Se autenticado, usa o ID do JWT
2. **IP Address** (fallback): Se não autenticado, usa o IP

### Rastreamento

- Registros armazenados na tabela `rate_limit_requests`
- Agregação em janelas de 5 minutos
- Limpeza automática de registros antigos (>1 hora)

### Verificação

```typescript
// Exemplo de uso
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const rateLimitResult = await checkRateLimit(req, 'endpoint-name');
if (!rateLimitResult.allowed) {
  return createRateLimitResponse(rateLimitResult, corsHeaders);
}
```

---

## 📊 Limites Configurados

| Endpoint | Limite | Janela | Descrição |
|----------|--------|--------|-----------|
| `ai-chat` | 30 req | 5 min | Chat com IA |
| `send-whatsapp` | 10 req | 5 min | Envio de WhatsApp |
| `send-notification` | 50 req | 5 min | Notificações gerais |
| `schedule-notifications` | 20 req | 5 min | Agendamento de notificações |
| `notification-status` | 100 req | 5 min | Consulta de status |
| `default` | 60 req | 5 min | Qualquer outro endpoint |

### Como Ajustar Limites

Edite o arquivo `supabase/functions/_shared/rate-limit.ts`:

```typescript
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'meu-endpoint': { maxRequests: 100, windowMinutes: 10 },
  // ...
};
```

---

## 🎯 Implementando em Novas Edge Functions

### 1. Importar o Helper

```typescript
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  addRateLimitHeaders 
} from '../_shared/rate-limit.ts';
```

### 2. Verificar Rate Limit

```typescript
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'meu-endpoint');
    
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit excedido: ${rateLimitResult.current_count}/${rateLimitResult.limit}`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Seu código aqui...
    
  } catch (error) {
    // Error handling
  }
});
```

### 3. Adicionar Headers de Rate Limit na Resposta

```typescript
// Adicionar informações de rate limit nos headers da resposta
const enhancedHeaders = addRateLimitHeaders(
  { ...corsHeaders, 'Content-Type': 'application/json' },
  rateLimitResult
);

return new Response(JSON.stringify(data), {
  headers: enhancedHeaders,
});
```

---

## 📡 Headers de Rate Limit

As respostas incluem headers informativos:

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 2025-10-20T15:30:00Z
```

### Quando Limite Excedido

```
HTTP/1.1 429 Too Many Requests
Retry-After: 300
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-10-20T15:30:00Z

{
  "error": "Limite de requisições excedido",
  "message": "Você excedeu o limite de 30 requisições por 5 minutos.",
  "current_count": 31,
  "limit": 30,
  "retry_after_seconds": 300
}
```

---

## 🔧 Funções do Banco de Dados

### `check_rate_limit`

Verifica se uma requisição está dentro do limite:

```sql
SELECT public.check_rate_limit(
  'user:123',           -- Identificador
  'ai-chat',            -- Endpoint
  30,                   -- Max requests
  5                     -- Window minutes
);
```

Retorna:
```json
{
  "allowed": true,
  "current_count": 15,
  "limit": 30,
  "window_minutes": 5,
  "retry_after_seconds": 0
}
```

### `cleanup_old_rate_limits`

Remove registros antigos (>1 hora):

```sql
SELECT public.cleanup_old_rate_limits();
```

**Recomendação**: Configure um cron job para executar isso a cada hora.

---

## 🧪 Testando Rate Limiting

### Teste Manual

```bash
# Fazer múltiplas requisições rapidamente
for i in {1..35}; do
  curl -X POST https://ycvbtjfrchcyvmkvuocu.supabase.co/functions/v1/ai-chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "teste"}]}'
  echo "Request $i"
done
```

### Teste Programático

```typescript
const testRateLimit = async () => {
  const promises = Array.from({ length: 35 }, (_, i) =>
    supabase.functions.invoke('ai-chat', {
      body: { messages: [{ role: 'user', content: 'teste' }] }
    })
  );

  const results = await Promise.all(promises);
  
  const allowed = results.filter(r => r.status === 200).length;
  const blocked = results.filter(r => r.status === 429).length;
  
  console.log(`Permitidas: ${allowed}, Bloqueadas: ${blocked}`);
};
```

---

## 📈 Monitoramento

### Queries Úteis

```sql
-- Top endpoints com mais requests
SELECT endpoint, SUM(request_count) as total
FROM public.rate_limit_requests
WHERE window_start >= now() - interval '1 hour'
GROUP BY endpoint
ORDER BY total DESC;

-- IPs/usuários mais ativos
SELECT identifier, endpoint, SUM(request_count) as total
FROM public.rate_limit_requests
WHERE window_start >= now() - interval '1 hour'
GROUP BY identifier, endpoint
ORDER BY total DESC
LIMIT 20;

-- Identificar possíveis abusos
SELECT identifier, endpoint, SUM(request_count) as total
FROM public.rate_limit_requests
WHERE window_start >= now() - interval '15 minutes'
GROUP BY identifier, endpoint
HAVING SUM(request_count) > 50
ORDER BY total DESC;
```

### Logs da Edge Function

Os logs incluem avisos quando o limite é excedido:

```
Rate limit excedido para ai-chat: 31/30
```

Acesse os logs no Dashboard do Supabase.

---

## 🚨 Troubleshooting

### Problema: Limite atingido muito rapidamente

**Solução**: Ajustar limites no arquivo `rate-limit.ts`:

```typescript
'ai-chat': { maxRequests: 60, windowMinutes: 5 }, // Era 30
```

### Problema: Usuários legítimos sendo bloqueados

**Causa**: Múltiplos usuários atrás do mesmo IP (NAT corporativo)

**Solução**: 
- Exigir autenticação (JWT) para usar identificação por user_id
- Aumentar limites para endpoints públicos
- Implementar whitelist de IPs corporativos conhecidos

### Problema: Rate limiting não está funcionando

**Debug**:

1. Verificar logs da edge function
2. Verificar se a tabela `rate_limit_requests` existe
3. Verificar se a função `check_rate_limit` existe
4. Verificar se o service role key está configurado

```sql
-- Verificar se funções existem
SELECT proname FROM pg_proc WHERE proname LIKE '%rate_limit%';

-- Verificar registros recentes
SELECT * FROM public.rate_limit_requests 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔒 Segurança

### Fail Open vs Fail Closed

O sistema atual usa **fail open**: se houver erro ao verificar rate limit, permite a requisição.

Isso evita que problemas no banco bloqueiem completamente o serviço.

Para mudar para **fail closed**:

```typescript
if (error) {
  console.error('Erro ao verificar rate limit:', error);
  // Bloquear em caso de erro
  return {
    allowed: false,
    current_count: 0,
    limit: config.maxRequests,
    window_minutes: config.windowMinutes,
    retry_after_seconds: 60,
  };
}
```

### Proteção de DDoS

O rate limiting protege contra ataques leves, mas para DDoS em larga escala:

1. **Cloudflare**: Ative proteção de DDoS
2. **Supabase**: Configure edge functions com rate limit de rede
3. **WAF**: Configure regras de Web Application Firewall

---

## 📋 Checklist de Implementação

- [x] Tabela `rate_limit_requests` criada
- [x] Função `check_rate_limit` criada
- [x] Função `cleanup_old_rate_limits` criada
- [x] Helper `rate-limit.ts` criado
- [x] Rate limiting em `ai-chat`
- [x] Rate limiting em `send-whatsapp`
- [ ] Rate limiting em outras edge functions (adicionar conforme necessário)
- [ ] Configurar cron job para cleanup
- [ ] Monitoramento e alertas configurados
- [ ] Documentação compartilhada com a equipe

---

## 🔄 Próximos Passos

1. **Cron Job**: Configurar job para limpar registros antigos a cada hora
2. **Alertas**: Configurar alertas quando limites são excedidos frequentemente
3. **Dashboard**: Criar dashboard de monitoramento de rate limiting
4. **Whitelist**: Implementar sistema de whitelist para IPs/usuários confiáveis
5. **Adaptive Limits**: Implementar limites adaptativos baseados em comportamento

---

*Última atualização: 2025-10-20*
