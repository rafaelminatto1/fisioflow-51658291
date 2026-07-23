# Webhooks e integrações externas

## Entrada

1. validar assinatura/timestamp antes de parsear negócio;
2. limitar tamanho e tipo de conteúdo;
3. persistir ID externo + hash para dedup;
4. responder rapidamente e processar pela Queue;
5. mapear para evento interno mínimo;
6. não logar payload bruto;
7. reconciliar periodicamente estados financeiros/mensageria.

## Saída

- allowlist de destino por integração;
- assinatura e versão do payload;
- timeout curto, retry idempotente e circuit breaker;
- secret por ambiente e rotação;
- DLQ/replay com autorização;
- consentimento/opt-out verificados no momento do envio.

## Integrações P1

| Integração | Uso | Gate |
|---|---|---|
| WhatsApp Business | confirmação, lembrete e inbox | opt-in, janela/template, kill switch |
| E-mail transacional | convite, segurança e documentos | domínio autenticado e conteúdo mínimo |
| Push Apple/Expo | próxima ação neutra | token por instalação e logout cleanup |
| Pagamento a escolher | cobrança ligada ao atendimento | webhook assinado e reconciliação |

Instagram, webchat, wearables, telemedicina, NFS-e e conteúdo externo pertencem ao roadmap oficial, mas não entram como placeholders no scaffold inicial. Cada adapter nasce em sua onda com contrato, consentimento, segurança, reconciliação e testes próprios.
