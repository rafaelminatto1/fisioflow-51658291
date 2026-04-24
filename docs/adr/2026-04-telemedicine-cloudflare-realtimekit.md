# ADR: Telemedicina — Jitsi agora, Cloudflare RealtimeKit na Fase 4.2

**Data:** 2026-04-24
**Status:** Aprovado
**Decisor:** @rafaelminatto1

## Contexto

O FisioFlow precisa oferecer videochamada para consultas de telemedicina. Hoje:

- Endpoint `POST /api/telemedicine/livekit-token` existe (gera JWT LiveKit)
- Componente `src/components/telemedicine/LiveKitRoom.tsx` está wired em `src/routes/enterprise.tsx` na rota `/telemedicine-room/:roomId`
- Na prática, o componente **renderiza iframe `meet.jit.si` como fallback** porque `@livekit/components-react` e `livekit-client` nunca foram instalados
- Secrets LiveKit (key + secret) estavam em `apps/api/.dev.vars` e foram **vazados no histórico git** (commit `e852d471`)
- Telemedicina não é prioridade comercial (Fase 4.2 do roadmap — pós WhatsApp, mobile e AI Roadmap)

## Opções avaliadas

| Opção | Custo/mês (10 consultas × 1h) | Maturidade | Integração stack | LGPD |
|---|---|---|---|---|
| Manter Jitsi público | R$ 0 | alta | zero | sem BAA/DPA |
| Cloudflare Realtime SFU (low-level) | R$ 0 (sempre, até 1000GB/mês) | média (beta→GA) | nativa | DPA CF ✅ |
| Cloudflare RealtimeKit (high-level) | R$ 0 hoje (Beta); ~R$ 12–42 pós-GA | média (Beta) | nativa | DPA CF ✅ |
| LiveKit Cloud | R$ 0 (free tier 83h/mês) a R$ 90–360 escalando | alta | externa | BAA opcional |
| Daily.co | R$ 0 (free 10k min) a pago | alta | externa | BAA |
| Zoom Video SDK | R$ 500+/mês | muito alta | externa | BAA |
| Agora | R$ 0 free tier, depois $/min | alta | externa | OK |
| Twilio Programmable Video | — | **descontinuado 2024** | — | — |

Pricing oficial consultado:
- https://developers.cloudflare.com/realtime/realtimekit/pricing/
- https://developers.cloudflare.com/realtime/sfu/pricing/

Cloudflare RealtimeKit Beta: **grátis enquanto durar**. Pós-GA:
- Audio/Video Participant: $0.002/min
- Gravação (exportação): $0.010/min
- Áudio-só: $0.0005/min
- R2 para recordings: $0.015/GB após 10 GB grátis

## Decisão

1. **Agora (até Fase 4.2)**: manter iframe Jitsi público como está. Zero custo, zero trabalho, sem mudança de código.
2. **LiveKit descartado permanentemente**:
   - Secrets novos rotacionados (API5VeauxZHf32D) serão **revogados pelo usuário** no console LiveKit
   - Valores antigos vazados (REDACTED-LIVEKIT-KEY, REDACTED-LIVEKIT-SECRET) vão ao `git filter-repo`
   - Endpoint `/api/telemedicine/livekit-token` continua retornando 503 quando secrets ausentes (comportamento atual já correto)
   - `src/components/telemedicine/LiveKitRoom.tsx` permanece no código; será reescrito para `CloudflareRealtimeKitRoom.tsx` na Fase 4.2
3. **Fase 4.2 — Migração Jitsi → Cloudflare RealtimeKit**:
   - Instalar `@cloudflare/realtimekit-react` + `@cloudflare/realtimekit-react-ui`
   - Substituir iframe Jitsi por componente `<RtkMeeting>`
   - Endpoint `/api/telemedicine/meeting` cria meeting via REST API CF (organization-scoped)
   - Gravações para R2 (`fisioflow-media` bucket)
   - Instrumentação via Analytics Engine
   - Consultar docs atuais via Exa MCP antes de implementar (Beta → GA pode ter mudado)

## Razões que pesaram

- **Zero custo durante Beta** e projeção ridícula pós-GA (~R$ 42/mês pra clínica pequena com gravação)
- **Zero conta externa**: billing CF consolidado, DPA LGPD já aceito
- **Mesma região/PoPs** do Worker API e R2 — latência consistente
- **Observabilidade nativa** via Analytics Engine (já em uso)
- **Escalabilidade barata**: SFU cobra GB de egress, não minuto de participante — curva de custo muito mais favorável que LiveKit/Zoom quando crescer

## Consequências

**Positivas:**
- Stack 100% Cloudflare (reforça tese arquitetural do projeto)
- Secrets gerenciáveis via `wrangler secret put`
- Gravações já no R2 sem integração extra
- Próximo incidente de vazamento impacta só um vendor

**Negativas a mitigar:**
- CF RealtimeKit ainda em Beta → roadmap depende de Cloudflare não mudar direção
- Comunidade menor que LiveKit → menos Stack Overflow
- Sem BAA HIPAA americano (irrelevante: operamos sob LGPD no Brasil)

## Fallback caso CF RealtimeKit não atenda em Fase 4.2

Se em 2026 a CF tiver descontinuado, renomeado, ou cobrar valores inviáveis: plano B = **Daily.co** (API simples, React hooks, BAA, ~$0.004/min — ~R$ 12/mês para 10h).

LiveKit e Zoom ficam fora da lista de plano B por complexidade/custo/latência.
