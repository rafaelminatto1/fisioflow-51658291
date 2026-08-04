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

3. **Job de Logpush → R2 — ADIADO DE PROPÓSITO** (Step 3 da Task 3 do plano).

   O bloqueio de PII caiu: os 8 `console.*` que carregavam nome, e-mail e telefone de
   paciente foram saneados em `f605f1b9d`, trocados por IDs já em escopo. Uma varredura
   sobre os 893 `console.*` de `apps/api/src` confirmou que os 7 restantes que citam
   campo suspeito usam UUID, contagem ou o `phone_number_id` da própria clínica.

   Mesmo assim o job **não** foi criado, por decisão de 04/08/2026:
   - Não há usuários. Não existe tráfego para arquivar; o job só acumularia log de um
     sistema ocioso.
   - Workers Logs (7 dias) já é melhor do que se tinha com o Axiom. O ganho marginal
     do R2 hoje é nulo.
   - Restam 893 `console.*` sem auditoria. Um arquivo **permanente** antes de haver
     disciplina de log acumula dívida, não observabilidade.
   - Criar o job exige cunhar uma credencial R2 de vida longa
     (`1002: invalid destination_conf: access-key-id must be provided`). Credencial
     permanente sem benefício presente é risco sem contrapartida.

   **Criar quando entrar uso real.** Comando pronto no plano original, Task 3 Step 3 —
   precisa de `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` (as mesmas já usadas como
   secrets do Worker, ou um token R2 novo escopado só ao bucket de destino).

   Correção ao que este documento dizia antes: o destino é `fisioflow-db-backups`, um
   bucket R2 **da própria conta** — o dado não sai para terceiro. A diferença real é de
   permanência: Workers Logs apaga sozinho em 7 dias, o R2 acumula até alguém apagar.

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
  `logEvent`; os 893 `console.*` crus de `apps/api/src` não passam por ele, e com
  amostragem 1 todos persistem. Os 8 que carregavam PII foram saneados (`f605f1b9d`),
  mas **a porta continua aberta para o próximo `console.log` que alguém escrever**.
  Não foi criada regra de lint proibindo `console.*`: seriam 893 violações preexistentes
  e o ruído enterraria o sinal. Alternativa melhor quando incomodar: uma regra que
  proíba apenas interpolação de identificadores conhecidos (`*email*`, `*phone*`,
  `*name*`) dentro de `console.*`.
- `routes/webhooks.ts:214` perdeu o `adminEmail` do log sem substituto. Não é dado de
  paciente; o custo é não conseguir diagnosticar um `ADMIN_NOTIFICATION_EMAIL` errado
  por esse log.
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
