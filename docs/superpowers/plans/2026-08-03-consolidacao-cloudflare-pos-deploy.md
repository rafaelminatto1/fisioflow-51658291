# Consolidação Cloudflare — pendências pós-deploy

Execução do plano `2026-08-03-consolidacao-cloudflare.md` concluída em 03/08/2026.
Review final da branch: **aprovada para produção**. Nada foi pushado ainda.

## Ordem obrigatória após o push

1. **Aguardar o deploy concluir.** Só então:
   `cd apps/api && npx wrangler secret delete AXIOM_TOKEN --env production`
   Apagar antes faria a produção, ainda rodando o código antigo, cair no `console.log`
   com a amostragem antiga.

2. **Confirmar os logs.** No Workers Logs do `fisioflow-api`, verificar eventos com os
   campos `level`, `message`, `environment`, e campos sensíveis como `[REDACTED]`.

3. **Job de Logpush → R2 — NÃO criar ainda.** É o Step 3 da Task 3 do plano.
   Motivo do bloqueio: o Workers Logs mantém o dado dentro da conta Cloudflare; o Logpush
   o exporta para fora. Enquanto os ~890 `console.*` crus do Worker não forem saneados
   (ver "Dívida conhecida" abaixo), exportar é uma exposição materialmente diferente.
   Liberar só depois de tratar os call sites que carregam PII.

4. **Vigiar o volume de logs por 48h.** O plano inclui 20M eventos/mês, depois
   US$ 0,60/milhão. A amostragem subiu de 0,1 para 1 — 10x mais eventos. Erros custam
   dois eventos cada (`errorHandler.ts:121` e `:132`); se o volume apertar, deduplicar
   esse par é a primeira economia.

5. **Vigiar a caixa sombra** (`rafaelstarton@gmail.com`). Vazia após 24h significa que
   `env.EMAIL.send` está falhando calado — a falha é engolida de propósito em
   `dispatch.ts` e só aparece como warn. Procurar `"shadow email falhou"` no Workers Logs.
   Causa mais provável: `noreply@moocafisio.com.br` não habilitado para Email Sending.

6. **Testar uma vez cada:** convite de acesso e emissão de NFS-e. Esses caminhos agora
   propagam erros do Resend que antes eram engolidos — é a correção pretendida, mas
   significa que podem falhar visivelmente onde antes falhavam em silêncio.

## Corte final do Resend (semanas à frente)

Step 12 da Task 5 do plano. Só após ~2 semanas de sombra sem falha de entrega e sem
classificação como spam. Exige, nesta ordem: onboardar `moocafisio.com.br` em
**Email Service → Domains**, remover `allowed_destination_addresses` do binding,
trocar `EMAIL_TRANSPORT` para `"cloudflare"` nos três blocos, remover `sendViaResend`,
remover a dependência `resend` e apagar `RESEND_API_KEY`.

Rollback a qualquer momento: `EMAIL_TRANSPORT=resend`.

## Dívida conhecida (aceita conscientemente, não esquecida)

- **`redactPII` não é a barreira que o spec afirmava.** Ele só protege o que passa por
  `logEvent`. Há ~890 `console.*` crus em `apps/api/src`, e com amostragem 1 todos
  persistem. Carregam PII pelo menos em: `cron.ts:1028` (e-mail do paciente),
  `routes/appointments.ts:896` e `:996` (nome completo), `routes/webhooks.ts:170`
  (e-mail), `routes/nfse.ts:624` (e-mail do contador). Sanear é pré-requisito do item 3.
- `redactPII` casa chave exata e case-sensitive: `full_name`, `patient_name`,
  `patient_phone`, `wa_id` passam batido. Nenhum call site atual espalha linha crua do
  banco, mas nada impede o próximo de fazer.
- `redactPII` sobre um `Error` devolve `{}` — `message` e `stack` não são enumeráveis.
- `errorHandler.ts:132` loga `path`, que contém UUID de paciente, enquanto `patientId`
  é redigido como chave. A política é incoerente consigo mesma.
- `EMAIL: SendEmail` está declarado como obrigatório em `types/env.ts`, diferente dos
  bindings vizinhos. Sem efeito funcional.
- `reconstruction-dossier/inventories/api-endpoints.csv:705` ainda aponta para
  `reports.ts:391` e `consumidor_front=sim` numa linha marcada `órfão`.
- `maskPhone` mora em `routes/whatsapp-inbox.ts` e é importado por um consumidor de fila.
  Não é import circular nem custo de bundle (Worker único), mas o lugar honesto seria
  um `lib/phone.ts`.
