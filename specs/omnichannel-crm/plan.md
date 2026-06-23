# Planejamento — CRM Omnichannel (WhatsApp + Instagram Direct + Chat no site)

Base: deck **Conversations Brasil 2026** (Meta) + documentação Meta atual (jun/2026) + estado do FisioFlow.

## 1. Novidades Meta/WhatsApp relevantes (2026)

| Novidade | O que é | Impacto p/ a clínica |
|---|---|---|
| **Meta Business Agent** | IA oficial que atende/agenda/qualifica/cobra 24h em WhatsApp, Messenger e **Instagram DMs**; conectável a CRM. Pago (WhatsApp Business Premium / tokens). | Alternativa ao nosso AI Concierge. Recomendo **manter o nosso** (mais barato, integrado ao nosso banco) e só monitorar/usar features de descoberta. |
| **Comércio no chat + Pix** | Catálogo nativo, checkout e **pagamento (Pix/Boleto/Payment Links)** dentro da conversa (Brasil). | Cobrar avaliação/pacote no chat → encurta funil. Integra com nosso NFS-e. |
| **Descoberta no WhatsApp** | Empresas com agente ficam buscáveis; compartilhar link/cartão de contato. | Mais leads inbound. |
| **CTWA + Marketing Messages API** | Anúncios clicam direto no WhatsApp; API dedicada p/ campanhas em escala. | Atribuição de origem do lead (ver insight #6). |
| **Coexistência App + Cloud API** | Mesmo número no app do WhatsApp e na Cloud API. | Recepção pode usar o app enquanto o CRM usa a API. |
| **Instagram Messaging API** | Receber/responder **DMs do Instagram** via webhook, mesmo Meta App do WhatsApp. | **Unificar IG no nosso inbox** (pedido do cliente). |

Brasil: 8/10 trocam mensagem com negócios semanalmente; 67% acham resposta de IA útil (Kantar/Meta, abr/2026).

## 2. Visão: Inbox Unificado

Hoje o `/crm-whatsapp` já tem inbox + pipeline + painel. A ideia é torná-lo **multicanal**: WhatsApp, Instagram Direct e Chat do site caem na **mesma** lista de conversas, com um selo de canal.

### Mudança de dados (base para tudo)
- `wa_conversations` / `wa_messages` / `whatsapp_contacts`: adicionar coluna **`channel`** (`whatsapp` | `instagram` | `webchat`, default `whatsapp`) + `channel_user_id`.
- Reaproveitar `findOrCreateConversation` / `addMessage` / `broadcastToOrg` (já existem) — só passam a carregar o canal.
- CRM (`CrmWhatsApp.tsx`): badge de canal no card + filtro por canal. Adapter já é genérico.

## 3. Instagram Direct → CRM (FACTÍVEL)

**Pré-requisitos (config, não código):**
1. Conta **Instagram Business** (@activityfisioterapia) vinculada a uma **Página do Facebook**.
2. No Meta App existente (`2479744142426362`): adicionar produto **Instagram**, assinar webhook do objeto `instagram` campo **`messages`**.
3. **App Review** da permissão `instagram_business_manage_messages` (⚠️ leva semanas — **começar já**). Em dev dá pra testar com até ~25 testers sem review.
4. Token de acesso da Página/IG (System User) → `wrangler secret put IG_ACCESS_TOKEN`.

**Backend:**
- Rota webhook (reusar padrão do `whatsapp-webhook.ts`): tratar entradas `object: instagram` → mapear IGSID do remetente → contato (`channel='instagram'`) → `addMessage` → broadcast → CRM.
- Responder: `POST /{IG_ID}/messages` (janela de 24h; fora dela não envia free-form).
- Concierge: reaproveitável (mesma lógica de `maybeSendConciergeGreeting`).

**Esforço:** médio (backend ~2-3 dias). **Gargalo = App Review** (externo, semanas).

## 4. Chat no site activityfisioterapia.com.br (WordPress + Elementor)

**Opção A — Click-to-WhatsApp (quick win, horas):**
- Botão flutuante "Fale no WhatsApp" via widget HTML do Elementor → `https://wa.me/5511587498 85?text=...` (ou CTWA).
- A conversa cai direto no nosso inbox WhatsApp (já funciona). Zero infra nova. Captura origem via parâmetro.
- **Recomendado fazer já.**

**Opção B — Widget de chat próprio → inbox unificado (1-2 sem):**
- Widget JS embarcável (script no Elementor) com painel de chat no site.
- Endpoints novos no Worker: `POST /api/webchat/session`, `POST /api/webchat/message`, `GET /api/webchat/poll|SSE`. CORS liberado p/ `activityfisioterapia.com.br`.
- Visitante identificado por cookie anônimo + captura opcional de nome/telefone; grava em `wa_conversations` `channel='webchat'`.
- Atendente responde pelo CRM; tempo real via SSE/poll.
- Permite atendimento mesmo sem o paciente ter WhatsApp aberto e mantém o histórico no CRM.

## 5. Roadmap proposto

| Fase | Entrega | Esforço | Pré-req |
|---|---|---|---|
| **0 — Quick wins** | Botão click-to-WhatsApp no site (Elementor) + captura de origem CTWA (insight #6) | Baixo (1-2 dias) | — |
| **1 — Instagram Direct** | Coluna `channel` + integração IG no inbox unificado | Médio | **iniciar App Review já** + IG Business + Página FB |
| **2 — Chat do site nativo** | ✅ Widget próprio → inbox unificado (`webchat`); envio do atendente channel-aware; CORS do site liberado | Entregue | — |
| **3 — Comércio no chat** | Pix/Payment Links pós-confirmação + avaliar Meta Business Agent | Alto | gateway/Meta Premium |

## 6. Recomendação imediata
1. **Hoje:** botão click-to-WhatsApp no site (Fase 0) + abrir o **App Review do Instagram** (gargalo de prazo).
2. **Em paralelo:** coluna `channel` (desbloqueia IG e webchat).
3. Depois: Instagram Direct (Fase 1) → widget do site (Fase 2).

## Referências
- Meta Business Agent (Conversations 2026): about.fb.com/news/2026/06/meta-business-agent
- Instagram Messaging API (Instagram Login): developers.facebook.com/docs/instagram-platform/.../messaging-api
- Webhooks Instagram Messaging: developers.facebook.com/docs/messenger-platform/instagram/features/webhook
- WhatsApp updates 2026 (Infobip): infobip.com/blog/whatsapp-news-and-updates
- Deck: `Conversations Brasil 2026 - content.pdf`
