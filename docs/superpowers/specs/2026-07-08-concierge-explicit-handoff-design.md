# Concierge — Handoff por pedido explícito + disclosure de IA

Data: 2026-07-08 · Status: aprovado (escopo P1+P2 + disclosure)

## Contexto

O concierge já ganhou (sessão anterior): pausa por takeover humano
(`humanReplyPauseHours`, default 0 = até resolver) e anti-repetição de saudação,
unificados em WhatsApp/Instagram/webchat.

Pesquisa (Twilio Flex/Gomez, Kommunicate, Notifyer, WhatsRB, Cresta, healthnote,
Plivo) converge: o gatilho #1 de handoff é o **pedido explícito de humano**,
detectado deterministicamente ANTES do LLM, com bordas para evitar falsos
positivos. Também recomendam divulgar a IA uma vez.

## Escopo desta entrega

### P1 — Handoff por pedido explícito de humano (3 canais)
- `wantsHumanAgent(text): boolean` — detector PT-BR determinístico.
  - Dispara: "falar com atendente/humano/pessoa/recepção/alguém/responsável",
    "quero um atendente", "atendimento humano", "tem alguém aí?", "me transfere
    pra uma pessoa", "prefiro falar com uma pessoa".
  - NÃO usa a palavra "agente" (em PT o gatilho é "atendente"); evita a classe de
    falso-positivo "sou corretor / agente da Caixa".
  - Guarda negativa: "sou/trabalho como atendente/recepcionista/secretária" → false.
- Quando dispara, ANTES de chamar o LLM:
  1. Envia UMA mensagem-ponte curta e acolhedora (`conciergeHandoffMessage`).
  2. Cria tarefa p/ a equipe (`createConciergeHandoffTask`, dedup 1h/conversa).
  3. Pausa o bot: marca `wa_conversations.metadata.concierge_handoff_at = now()`
     e `status='pending'`. As queries de takeover passam a usar
     `GREATEST(last_agent_at, concierge_handoff_at)` → com default (0) o bot fica
     em silêncio até a conversa ser resolvida/fechada.

### P2 — Ordem determinística antes do LLM
- `wantsHumanAgent` roda antes de `processMessage` nos 3 canais (economia de
  latência/token + handoff garantido).

### Disclosure de IA (1x)
- `discloseAi: boolean` na config do concierge (default **true**).
- `conciergeIdentity`: quando `discloseAi !== false`, a assinatura vira
  "Sou o assistente virtual da {clinicName}" (em vez de "Sou o {attendantName}
  da {clinicName}"). A detecção/strip de saudação segue funcionando (LEADING_
  GREETING_RE cobre saudação genérica + assinatura antiga em históricos).
- Toggle na UI (aba AI Concierge).

## Fora de escopo (deferidos)
Handoff por sentimento/frustração, detecção de dado sensível (cartão/CPF), fluxo
abreviado p/ paciente recorrente, bot-as-agent handback.

## Testes
- `wantsHumanAgent`: positivos + falsos-positivos ("sou corretor", "sou
  atendente", "agente da Caixa", perguntas normais).
- `conciergeIdentity` com `discloseAi`.
- Wiring por canal: pedido explícito → bridge enviado, LLM NÃO chamado, tarefa
  criada, metadata de pausa gravada.
- Takeover respeita `concierge_handoff_at`.
