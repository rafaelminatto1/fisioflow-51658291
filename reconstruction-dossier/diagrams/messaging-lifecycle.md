# Máquina de estados — Conversa WhatsApp/IG/Webchat e Mensagem

Fontes: `packages/db/src/schema/whatsapp-inbox.ts:57-59` (conversa: status default `open`, priority `normal`, channel `whatsapp`), `:104` (mensagem: default `pending`), webhook Meta atualiza sent/delivered/read/failed (`apps/api/src/routes/whatsapp-webhook.ts`), campanhas `apps/api/src/cron.ts:311-334`.

## Conversa / lead

```mermaid
stateDiagram-v2
    [*] --> open : inbound via webhook (roteado por phone_number_id)

    open --> open : troca de mensagens (janela 24h WhatsApp / 7d IG)
    open --> atribuida : roteamento round_robin / least_busy (gated)
    atribuida --> open : reaberta / nova mensagem
    open --> handoff_pendente : concierge fora de escopo (máx 1/30min + tarefa)
    handoff_pendente --> atribuida : humano assume (bot silencia 15min)
    open --> resolvida : atendente resolve
    resolvida --> open : cliente volta a escrever

    state "temperatura (paralela)" as temp {
        quente --> frio : >7 dias sem inbound
    }

    note right of open
        - Lead score 0-100 recalculado (batch 06h UTC + on-the-fly)
        - SLA breaches: first/next/resolution (cron */15 escala)
        - Automations só com automations_enabled=true (default OFF)
    end note
```

## Mensagem outbound

```mermaid
stateDiagram-v2
    [*] --> pending : POST no inbox / automação
    pending --> sent : aceita pela Meta
    pending --> falha_janela : fora da janela 24h sem template / IG fora da janela
    sent --> delivered : webhook status
    delivered --> read : webhook status
    sent --> failed : webhook status
    sent --> apagada : delete-for-everyone (dentro da janela de horas)
    read --> [*]
    failed --> [*]
```

## Campanha

```mermaid
stateDiagram-v2
    [*] --> rascunho
    rascunho --> agendada : define agendada_em
    agendada --> enviando : cron horário (agendada_em <= now)
    enviando --> enviada : processCampaignSend (sent/failed contabilizados)
    enviada --> [*]
```

## Template Meta

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /api/whatsapp/templates (validação frontend antes)
    PENDING --> APPROVED : Meta aprova (/templates/sync)
    PENDING --> REJECTED : Meta rejeita
    APPROVED --> [*] : utilizável fora da janela 24h
```
