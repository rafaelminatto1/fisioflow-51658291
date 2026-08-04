# Consolidação Cloudflare — pendências pós-deploy

Execução do plano `2026-08-03-consolidacao-cloudflare.md` concluída em 03/08/2026.
Review final da branch: **aprovada para produção**.

**EM PRODUÇÃO desde 04/08/2026** (`cac7d3f9a`, deploy às 00:23:57Z). Itens 1 e 2 abaixo
já executados; 3 adiado por decisão; 4, 5 e 6 seguem pendentes.

## Ordem obrigatória após o push

1. **Apagar o `AXIOM_TOKEN` após o deploy — FEITO em 04/08/2026.** Removido via API;
   restaram 41 secrets, nenhum do Axiom. A ordem importava: apagar antes faria a
   produção, ainda rodando o código antigo, cair no `console.log`.

2. **Confirmar os logs — FEITO em 04/08/2026.** Verificado em produção sondando
   `GET /.git/<algo>`, que dispara `logEvent` nível `warn` e devolve 403 sem efeito
   colateral (é o guarda anti-scanner de `index.ts:159`). O evento chegou íntegro:

   ```json
   { "_time": "2026-08-04T16:50:06.045Z", "environment": "production",
     "level": "warn", "message": "blocked_sensitive_scanner_path",
     "path": "/.git/pos-deploy-check", "requestId": "c0e5d8d4-..." }
   ```

   O Workers Logs indexou **cada campo separadamente** — dá para filtrar por `level`,
   `path` ou `requestId` no painel, o que o Axiom não entregava.

   > **Política de log definida em 04/08/2026**, a partir da inspeção do log real de
   > produção — não prevista no spec:

   > - **`patientId` NÃO é redigido** (commit `44bfb41b7`). Era, e isso deixava as 5
   > chamadas de `logEvent` em `ai-clinical.ts` registrando `[REDACTED]` — sem alça para
   > depurar. Também contradizia a política dos `console.*`, onde nome de paciente foi
   > trocado **por** id. UUID não identifica ninguém sem acesso ao banco, e quem lê o log
   > da Cloudflare não tem o banco.
   > - **O IP do requisitante é logado e permanece assim.** Aparece nos dois `logEvent` de
   > `index.ts` (bloqueio de scanner e sondagem de raiz). IP é dado pessoal sob a LGPD,
   > mas a finalidade aqui é segurança — legítimo interesse do art. 7º, IX. Logar o IP de
   > quem tenta ler `/.git/` é o propósito da linha, não um efeito colateral.
   > - Continuam redigidos: `cpf`, `phone`, `email`, `patientName`, `fullName`, `name`,
   > `password` — todos com teste próprio desde `44bfb41b7`.

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
- `errorHandler.ts:132` loga `path`, que contém UUID de paciente. Coerente com a
  política desde `44bfb41b7` (UUID não é redigido), mas continua sendo dado que persiste.
- `EMAIL: SendEmail` está declarado como obrigatório em `types/env.ts`, diferente dos
  bindings vizinhos. Sem efeito funcional.
- `reconstruction-dossier/inventories/api-endpoints.csv:705` ainda aponta para
  `reports.ts:391` e `consumidor_front=sim` numa linha marcada `órfão`.
- `maskPhone` mora em `routes/whatsapp-inbox.ts` e é importado por um consumidor de fila.
  Não é import circular nem custo de bundle (Worker único), mas o lugar honesto seria
  um `lib/phone.ts`.

## Encerramento da infraestrutura — 04/08/2026

Fechamento dos itens da auditoria original que não pertenciam ao plano de consolidação.

### Corrigido

- **Staging escrevia no banco de PRODUÇÃO.** O config Hyperdrive `fisioflow-neon-staging`
  apontava para `ep-wandering-bonus-acj4zwvo-pooler`, o mesmo endpoint da produção, com
  cache de 300s sobre dado clínico. O `wrangler.toml` afirmava isolar staging, e isolava
  R2, D1, KV e filas — mas não o banco. Criada a branch Neon `staging`
  (`br-dark-waterfall-acco722l`) e o config reapontado, mantendo o papel `app_runtime`
  para não mascarar falhas de RLS. Rollback: host anterior
  `ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech`, limite 60.
- **Hyperdrive de produção com limite de 5 conexões** (padrão do produto é 25, e o Neon
  aceita 112). Elevado para 25 via PATCH. Cache segue **desligado** de propósito: dado
  clínico não deve ser servido de cache. O padrão correto para leitura imutável seria um
  segundo config com cache, o que exige mudança de código — fica para quando doer.
- **App do paciente apontava para o worker errado.** `apps/patient-app` usava
  `api.moocafisio.com.br`, que roteia para `activity-lab-api` e devolve **404** em
  `/api/patient-portal`. Corrigido para `api-paciente.moocafisio.com.br` (401 = rota
  existe). Latente porque não há usuários, mas o app estava quebrado.

### Apagado

16 configs Hyperdrive órfãs (`moocafisio-auth/backup/jobs/staff`, `moocafisio-br-*`,
`moocafisio-clean-*`, `moocafisio-staging-*`), as filas `moocafisio-outbox` e
`-dlq` (sem produtor nem consumidor), os índices Vectorize `fisioflow-clinical` e
`-staging` (sem binding e sem uso no código), e os workers `scheduled-worker` e
`turnstile-siteverify-moocafisio` (sem rota, sem domínio, sem fonte no repo).

### NÃO apagado, e por quê

- **`activity-lab-api/web/whc06-web`** — a auditoria original os listou como órfãos, mas
  têm domínios ativos: `api.moocafisio.com.br`, `lab.moocafisio.com.br`,
  `lab2.moocafisio.com.br`. São outro produto. Decisão sua.
- **`gestao-saude-db`** (Hyperdrive) — pertence ao worker `gestao-saude-cloudflare`, cujo
  wrangler vive em outro repositório.
- **`fisioflow-tasks-dlq` e `-staging`** — aparecem com 0 produtores e 0 consumidores na
  API, mas são as DLQ declaradas no `wrangler.toml`. A API não conta destino de DLQ.
- **Todos os buckets R2** — `wrangler r2 object list` não deu contagem confiável e apagar
  bucket com dado é irreversível. Armazenamento custa centavos; o risco não compensa.
  Verificar manualmente antes de mexer.

### Ainda em aberto

- **Zero Trust Access** não foi habilitado. Ao testar, o staging **não** estava aberto:
  `/api/patients` e `/api/appointments` devolvem 401; só `/api/health` é público, por
  design. O ganho de Access seria esconder a superfície, não proteger dado — defesa em
  profundidade, não emergência.

## Zero Trust Access — habilitado em 04/08/2026

O que mudou a prioridade: a branch Neon `staging` criada hoje é **cópia da produção** —
tem os 1.022 pacientes reais. Proteger o staging deixou de ser cosmético.

### Provisionado
- Organização Zero Trust criada (não existia): `moocafisio.cloudflareaccess.com`
- Provedor de identidade: **PIN por e-mail** (`onetimepin`) — não exige IdP externo
- Domínio novo `staging.moocafisio.com.br` → `fisioflow-web-staging`
  (o `api-staging.moocafisio.com.br` já existia)
- Três aplicações Access:
  - `api-staging.moocafisio.com.br/api/health` → **bypass** (todos), para o monitoramento
  - `api-staging.moocafisio.com.br` → allow `rafaelstarton@gmail.com`
  - `staging.moocafisio.com.br` → allow `rafaelstarton@gmail.com`

### O detalhe que faz o Access valer alguma coisa
Access só protege hostname em zona sua — **não alcança `*.workers.dev`**. Com a URL
workers.dev viva, ela contornaria a política inteira. Por isso o subdomínio foi desligado
nos dois workers de staging (hoje respondem 404), e `workers_dev = false` foi fixado em
`[env.staging]` para o próximo deploy não reabrir.

As vars que apontavam para `*.workers.dev` foram migradas para os domínios novos em
`apps/api/wrangler.toml`, `.github/workflows/staging.yml` e `apps/ai-gateway/wrangler.jsonc`.

### Verificado
```
api-staging.moocafisio.com.br/api/patients → 302 (login do Access)
api-staging.moocafisio.com.br/api/health   → 200 (bypass)
staging.moocafisio.com.br/                 → 302 (login do Access)
fisioflow-api-staging.<...>.workers.dev    → 404
fisioflow-web-staging.<...>.workers.dev    → 404
api-pro.moocafisio.com.br/api/health       → 200 (produção intacta)
```

### Correção ao que foi dito antes
A auditoria original chamou o staging de "exposto". Ao testar, `/api/patients` e
`/api/appointments` já devolviam **401** — o dado estava atrás de auth. O ganho do Access
é esconder a superfície e impedir enumeração, não destrancar algo que estava aberto.
Produção **não** foi posta atrás de Access: ela tem usuários finais e auth própria.
