# WhatsApp Flow — Agendar Consulta

Fonte versionada do Flow. A publicação é feita no WhatsApp Manager (Meta),
pois Flow publicado é imutável (clonar para alterar).

## Passos (fase de implementação, com login do Rafael)
1. WhatsApp Manager > Flows > Create > "Book an appointment" (ou importar este JSON).
2. Endpoint: colar a URL `https://<worker>/api/whatsapp/flows/data`, conectar o Meta App.
3. Preview > "Request data on first screen" -> deve renderizar a lista de fisios (health/INIT OK).
4. Publicar (irreversível — confirmar antes).
5. Copiar o `FLOW_ID` gerado -> usado no trigger (próximo plano) para `sendFlowMessage`.

Endpoint espera: telas `APPOINTMENT`; campos `therapist`, `date`, `slot`.
