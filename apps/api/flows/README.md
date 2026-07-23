# WhatsApp Flow — Agendar Atendimento

Fonte versionada do Flow. A publicação é feita no WhatsApp Manager (Meta).
Flow publicado pode receber **novas versões** (editar o JSON no builder → Publicar).

- **FLOW_ID publicado:** `1706568520560773` (WABA `806225345331804`)
- **Endpoint:** `https://fisioflow-api.rafalegollas.workers.dev/api/whatsapp/flows/data`
- **App conectado:** Activity Fisioterapia (`2479744142426362`)

## Contrato (deve casar com o endpoint)
- Tela `APPOINTMENT`; campos `type`, `therapist`, `date`, `slot`.
- `type`: `evaluation` (Avaliação) | `session` (Sessão) — ver `BOOKING_TYPES` em `src/lib/flowsBooking.ts`.
- INIT retorna `types` + `therapists`; `data_exchange` (ao escolher data) retorna `slots`.
- Conclusão (`nfm_reply`) → `src/queues/whatsapp-inbound.ts` cria pedido em `public_booking_requests`.

## Publicar nova versão
1. WhatsApp Manager → Flows → "Agendar Atendimento" → editor.
2. Colar o conteúdo de `agendar-atendimento.flow.json` → Executar → Salvar → Publicar.
