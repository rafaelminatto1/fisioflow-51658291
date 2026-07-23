# Máquina de estados — Agendamento

Fontes: enum `appointment_status` (`packages/db/src/schema/appointments.ts:34-46`), status é `varchar` default `"agendado"` (linha 86 — enum não imposto na coluna, e há status customizáveis por org em `appointment_status_settings`). `payment_status` e `billing_status` são eixos paralelos.

```mermaid
stateDiagram-v2
    [*] --> agendado : POST /api/appointments (sem conflito 409)

    agendado --> presenca_confirmada : paciente confirma (D-2/D-1/same-day ou check-in)
    agendado --> remarcar : pedido de remarcação
    agendado --> cancelado : cancelamento
    agendado --> faltou : não compareceu (genérico)
    agendado --> faltou_com_aviso : faltou avisando
    agendado --> faltou_sem_aviso : faltou sem avisar
    agendado --> nao_atendido : clínica não atendeu
    agendado --> nao_atendido_sem_cobranca : não atendido, sem cobrança
    agendado --> avaliacao : marcado como avaliação
    agendado --> atendido : sessão realizada

    presenca_confirmada --> atendido : sessão realizada
    presenca_confirmada --> faltou_sem_aviso : confirmou mas não veio
    presenca_confirmada --> cancelado

    remarcar --> agendado : novo horário definido
    avaliacao --> atendido : avaliação realizada

    atendido --> [*]
    cancelado --> [*]
    faltou --> [*]
    faltou_com_aviso --> [*]
    faltou_sem_aviso --> [*]
    nao_atendido --> [*]
    nao_atendido_sem_cobranca --> [*]

    note right of agendado
        Guardas na criação/edição:
        - 409 constraint no_overlapping_therapist_appointments
        - 409 capacidade do slot (countsTowardCapacity)
        Régua de confirmação: cron D-2, D-1 urgente (dedup), same-day
    end note
```

## Eixos paralelos

```mermaid
stateDiagram-v2
    state "payment_status" as pay {
        [*] --> pending
        pending --> paid : pagamento integral
        pending --> partial : pagamento parcial
        partial --> paid
        paid --> refunded : estorno
    }
    state "billing_status" as bill {
        [*] --> b_pending
        b_pending --> ready_for_invoice : atendimento faturável
        ready_for_invoice --> invoiced : NFS-e/fatura emitida
    }
```
