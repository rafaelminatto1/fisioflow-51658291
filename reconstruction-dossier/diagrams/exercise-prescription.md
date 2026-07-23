# Máquina de estados — Prescrição de exercícios (HEP)

Fontes: `apps/api/src/routes/exercisePlans.ts:41-48` (status default `"ativo"`; update whitelist inclui `status` como texto livre — estados além de `ativo` inferidos do uso: concluído/pausado). Lembretes: `apps/api/src/cron.ts:101-105` (WhatsApp gated) e `:336-348` (push 18h BRT).

```mermaid
stateDiagram-v2
    [*] --> rascunho_montagem : fisio seleciona exercícios (biblioteca/template/IA)
    rascunho_montagem --> ativo : POST /api/exercise-plans (default "ativo")

    ativo --> ativo : paciente executa (exercise_sessions registram aderência)
    ativo --> pausado : fisio pausa (PATCH status)
    pausado --> ativo : retoma
    ativo --> concluido : fim do tratamento / end_date
    ativo --> substituido : nova prescrição substitui

    concluido --> [*]
    substituido --> [*]

    note right of rascunho_montagem
        Guardas de montagem:
        - pathologies_contraindicated / icd10_codes filtram sugestões
        - exercícios is_public=false só da própria org
        - busca semântica: embeddings 1024d (bge-m3)
    end note
    note right of ativo
        Acesso do paciente:
        - Portal (/portal) ou QR público /prescricoes/publica/:qrCode (sem login)
        Lembretes:
        - WhatsApp diário via cron 09h UTC (gate automations_enabled)
        - Push HEP diário 21h UTC (18h BRT)
        Analytics de aderência em /exercises/analytics
    end note
```
