# Contrato de eventos

## Envelope versionado

```json
{
  "eventId": "uuid",
  "type": "clinical.session.finalized",
  "version": 1,
  "occurredAt": "2026-07-13T12:00:00Z",
  "organizationId": "uuid",
  "aggregate": {
    "type": "clinicalSession",
    "id": "uuid",
    "sequence": 4
  },
  "subject": {
    "type": "patient",
    "id": "uuid"
  },
  "actor": {
    "kind": "staff",
    "identityId": "uuid",
    "membershipId": "uuid"
  },
  "correlationId": "uuid",
  "causationId": "uuid-or-null",
  "data": {}
}
```

O exemplo é sintético. `subject` e `causationId` podem ser nulos; `membershipId` só existe para ator staff. `data` carrega o mínimo necessário e consumidores buscam detalhes por caso de uso autorizado. `type + version` identifica o schema; não se misturam o sufixo `.v1` e um campo de versão divergente.

## Catálogo alvo

Somente `patient.created` é candidato ao primeiro slice com mutação. Os demais entram junto do domínio produtor, nunca como infraestrutura vazia antecipada.

| Evento | Produtor | Consumidores candidatos |
|---|---|---|
| `identity.membership.activated` | Organizations | audit, onboarding |
| `patient.created` | Patients | audit, search projection |
| `appointment.created` | Scheduling | reminder, finance projection, patient calendar sync |
| `appointment.rescheduled` | Scheduling | reminder, patient calendar sync |
| `appointment.status-changed` | Scheduling | Radar, reminder, finance, patient calendar sync |
| `clinical.session.finalized` | Clinical | outcomes, summary, tasks, finance |
| `outcome.recorded` | Outcomes | Radar, Mapa de Resultados |
| `exercise.plan-assigned` | Exercises | patient notification |
| `exercise.execution-recorded` | Exercises | adherence projection, Radar |
| `care.signal.opened` | Care Radar | tasks, notification |
| `consent.revoked` | Consent/LGPD | messaging, AI/media processors |

## Garantias reais

- entrega **pelo menos uma vez**; duplicata após publish bem-sucedido e falha ao marcar é comportamento esperado;
- deduplicação no consumidor por chave única `(consumerName, eventId)`;
- sequência monotônica somente dentro de `(organization, aggregateType, aggregateId)`; não há ordem global;
- sequência é alocada atomicamente na mesma transação do aggregate e da outbox;
- consumidor grava seu efeito e o receipt na mesma transação quando ambos usam Postgres;
- evento fora de ordem é adiado, reconciliado ou ignorado conforme política explícita do consumidor;
- o consumidor de calendário trata a operação do evento apenas como notificação, relê o estado canônico e converge por `(connectionGeneration, appointmentSequence, privacyVersion)` conforme a especificação dedicada;
- retry usa backoff, `availableAt`, lease recuperável e limite; esgotamento vai para DLQ;
- replay é autorizado, auditado e não apaga receipts para forçar efeito sem decisão específica;
- mudança incompatível cria nova versão; eventos publicados são imutáveis.

## Outbox e dispatcher

1. O caso de uso altera o estado e insere a outbox na mesma transação.
2. Runtimes de requisição possuem somente `INSERT` na outbox.
3. Um login/capability exclusivo de jobs seleciona lotes, estabelece `lockedAt/lockedBy`, publica e marca o resultado.
4. Lease vencido pode ser reclamado; erro armazenado é código técnico redigido, nunca payload bruto.
5. Dispatcher e consumidor não usam `DELETE`; retenção é um job separado, aprovado e compatível com auditoria/legal hold.

O DDL de foundation contém as colunas e grants necessários, mas o algoritmo de alocação de sequência e leasing ainda precisa de teste de concorrência antes de virar migration executável.

O contrato completo de sincronização externa do paciente está em `docs/superpowers/specs/2026-07-14-sincronizacao-calendario-paciente-design.md`.

## Cenários obrigatórios de teste

- duas transações concorrentes no mesmo aggregate;
- publish ok + falha antes de marcar;
- retry após timeout e lease abandonado;
- duplicação, reorder, replay e poison message;
- receipt e efeito revertidos juntos;
- revogação de acesso antes de o consumidor buscar detalhes;
- DLQ, log e trace sem PHI.

## Dados proibidos no evento

- texto completo de evolução;
- gravação/transcrição;
- CPF, telefone, e-mail ou nome;
- URL pública de arquivo;
- token/secret;
- payload integral de webhook externo.
