# Máquina de estados — Pacote de sessões / Pagamento

Fontes: CHECK da migration `apps/api/migrations/0039_session_packages.sql:31` (`ativo/esgotado/expirado/cancelado` — valores efetivos usados por `apps/api/src/routes/packages.ts:245-278`). Atenção: o enum Drizzle `package_status` declara EN (`active/expired/used/cancelled`, `packages/db/src/schema/financial.ts:235-240`) — divergência a resolver na reconstrução.

```mermaid
stateDiagram-v2
    [*] --> ativo : venda do pacote (CHECK total_sessions > 0)

    ativo --> ativo : consumir sessão (used_sessions+1, guard used<total)
    ativo --> alerta_renovacao : consumo deixa remaining = 1 (renewal gate)
    alerta_renovacao --> ativo : ainda consome a última
    ativo --> esgotado : consumo zera saldo (status via CASE no UPDATE)
    alerta_renovacao --> esgotado : última sessão consumida
    ativo --> expirado : tentativa de consumo com expiry_date vencida (lazy)
    ativo --> cancelado : cancelamento administrativo

    esgotado --> [*]
    expirado --> [*]
    cancelado --> [*]

    note right of ativo
        Consumo recusado:
        - "Pacote sem sessões restantes" (400) se remaining<=0
        - "Pacote expirado" (400) + marca expirado
    end note
```

## Transação financeira / recibo / NFS-e

```mermaid
stateDiagram-v2
    state "financial_transactions" as ft {
        [*] --> pending
        pending --> paid : baixa
        pending --> overdue : vencida (vira tarefa via cron 12h UTC)
        overdue --> paid
    }
    state "NFS-e" as nfse {
        [*] --> rascunho
        rascunho --> emitida : assinatura XML + envio prefeitura (homologacao default)
        emitida --> cancelada
    }
    state "comissão (payout mensal)" as com {
        [*] --> calculada : summary (default 40% se sem config)
        calculada --> paga : POST /commissions/payout
    }
```
