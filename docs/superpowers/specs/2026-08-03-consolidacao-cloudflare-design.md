# Consolidação de fornecedores na Cloudflare

**Data:** 2026-08-03
**Status:** Design aprovado, aguardando plano de implementação

## Objetivo

Reduzir a quantidade de fornecedores externos do FisioFlow, movendo para a Cloudflare
tudo que ela já cobre e que o plano Workers Paid já paga. O objetivo é **um só plano de
controle** — menos contas, menos chaves, menos dashboards, menos free tier para vigiar.

Este spec **não é uma iniciativa de economia**. A fatura Cloudflare atual é de US$ 5/mês
(Workers Paid; zonas, R2 e Images/Stream em plano gratuito) e os fornecedores externos em
questão estão todos em free tier ou desconfigurados. O ganho é operacional, não financeiro.

## Escopo

Saem: **Resend**, **Axiom**, **Grafana Cloud (OTLP)**, restos do **Inngest**, **quickchart.io**.

Ficam, deliberadamente:

- **Sentry** — não existe equivalente na Cloudflare. Workers Logs não agrupa issues nem
  resolve sourcemaps. Substituí-lo seria perda de capacidade, não consolidação.
- **PostHog** — Web Analytics + Zaraz cobrem pageview e funil, mas não session replay nem
  feature flags.

Fora de escopo (válidos, mas de outro spec): Realtime/teleconsulta, Hyperdrive de produção,
Zero Trust Access, limpeza de recursos órfãos da conta.

## Princípio arquitetural

Cada fornecedor sai **por trás de uma fachada interna**, nunca nos call sites. As três
fachadas já existem no código. O trabalho é trocar o corpo delas preservando as assinaturas.

Consequência: os 21 call sites de log, os 8 de evento de fundo e os 7 de e-mail não mudam.
O diff fica concentrado em poucos arquivos e cada fase é revertível isoladamente.

## Fase 1 — Varredura seca

Três remoções sem mudança de comportamento externo.

### 1.1 Grafana Cloud

`GRAFANA_OTLP_TOKEN` não possui uma única referência no código. É secret morto.

- Confirmar com `grep -ri grafana apps/api/src` (deve retornar vazio)
- `wrangler secret delete GRAFANA_OTLP_TOKEN` (produção e staging)

### 1.2 Inngest → Cloudflare Queues

`triggerInngestEvent()` já envia para `BACKGROUND_QUEUE`. Não há nenhuma chamada ao Inngest
no corpo da função — apenas o nome sobreviveu à portabilidade de Jun/2026.

- `apps/api/src/lib/inngest-client.ts` → `apps/api/src/lib/backgroundEvents.ts`
- `triggerInngestEvent` → `triggerBackgroundEvent`
- Atualizar 8 call sites: `routes/appointments.ts` (3), `cron.ts` (2),
  `routes/exercisePlans.ts` (2), `routes/patients.ts` (1)
- Remover `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY` de `types/env.ts` e dos secrets
- O corpo da função não muda

### 1.3 Axiom → Workers Logs

`logToAxiom()` já cai em `console.log` quando não há token. A migração inverte qual caminho
é o principal.

- `apps/api/src/lib/axiom.ts` → `apps/api/src/lib/logger.ts`
- `logToAxiom(env, ctx, data)` → `logEvent(env, ctx, data)`, mesma assinatura
- Corpo: `console.log(JSON.stringify(redacted))` estruturado (Workers Logs indexa por campo)
- Remover o `fetch` para o Axiom e as vars `AXIOM_TOKEN`, `AXIOM_ORG_ID`, `AXIOM_DATASET`
  de `wrangler.toml` (blocos default, `env.production` e `env.staging`)
- `redactPII` permanece e ganha importância: hoje protege dado que sai da conta, depois
  protege dado que persiste dentro dela

**Regressão a evitar (crítico):** `wrangler.toml` tem `[observability.logs]
head_sampling_rate = 0.1`. O Axiom recebia 100% dos eventos, porque cada `logToAxiom` é um
`fetch` explícito que ignora amostragem. Trocar só o transporte descartaria 90% dos logs.

Correção obrigatória: `head_sampling_rate = 1` no bloco `logs` (produção e staging),
mantendo `traces` em `0.05`. O plano inclui 20M eventos/mês, depois US$ 0,60/milhão — folgado
para o volume de uma clínica.

### 1.4 Logpush → R2

Workers Logs retém 7 dias. Para histórico longo, job de Logpush contínuo para R2.

- Dataset `workers_trace_events`, destino `r2://fisioflow-db-backups/logs/{DATE}`
- Reaproveita `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` já existentes
- `logpush = true` no `wrangler.toml`
- 10M requisições/mês inclusas no plano Workers Paid

## Fase 2 — Resend → Cloudflare Email Service

O único item com risco real: o Email Sending está em **beta público, sem histórico de
entregabilidade**, e os e-mails carregam convite de acesso, NFS-e para a contabilidade e
prescrição para paciente.

### Shadow-send, não dual-send

Enviar pelos dois provedores em paralelo faria o destinatário receber **dois e-mails
idênticos**. O padrão adotado é sombra:

```
Resend     → destinatário real           (principal; nada muda para o paciente)
Cloudflare → rafaelstarton@gmail.com    (cópia sombra, destino verificado no Email Routing)
```

Observa-se por ~2 semanas se a cópia chega, com que latência, se o HTML renderiza e se cai
em spam. Depois inverte-se o principal e remove-se o Resend.

### Estrutura

- As 6 funções `send*` de `lib/email.ts` mantêm assinatura; passam a montar um
  `EmailMessage` neutro (`{ to, subject, html }`)
- `lib/email/dispatch.ts` — decide o transporte
- `lib/email/transports.ts` — `sendViaResend()` e `sendViaCloudflare()`
- Var `EMAIL_TRANSPORT`: `resend` | `shadow` | `cloudflare`. O corte final e o rollback são
  troca de variável, sem deploy de código

### Pré-requisitos

- Habilitar **Email Routing** na zona `moocafisio.com.br` — **feito em 03/08/2026**
  (`status: ready`). O apex não tinha MX, então nada de inbound foi quebrado; os registros
  de envio do Resend em `send.moocafisio.com.br` continuam intactos
- Ter ao menos um **endereço de destino verificado**: `rafaelstarton@gmail.com` foi
  adicionado, mas a verificação exige clique no e-mail da Cloudflare. O binding `send_email`
  só aceita destino verificado — um alias da zona não serve (`2054`)
- Binding `send_email` no `wrangler.toml`
- Registros DKIM/SPF/DMARC (a zona já está na Cloudflare)
- Envio para destinatário arbitrário exige Workers Paid — já atendido

Cota: 3.000 e-mails/mês inclusos, depois US$ 0,35/1.000.

## Fase 3 — quickchart.io

O endpoint `GET /api/reports/chart` (`routes/reports.ts:391`) monta uma config Chart.js e
busca um PNG em `quickchart.io`.

**O endpoint não tem nenhum consumidor.** O front usa Recharts; a única menção no repositório
é `specs/professional-app-completion.md:28`, marcando a rota como concluída.

Ação: **deletar o endpoint**, em vez de reescrevê-lo em SVG. Remove o fornecedor com saldo
negativo de linhas. Se surgir necessidade futura de gráfico server-side (PDF, e-mail), gerar
SVG no próprio Worker — Browser Rendering seria desproporcional para um gráfico de barras.

Esta é a única mudança de comportamento observável do spec e precisa de confirmação
explícita antes da execução.

## Verificação

Cada fase tem critério objetivo, não impressão:

| Fase | Verificação | Reversão |
|---|---|---|
| 1.1 Grafana | `grep -ri grafana apps/api/src` vazio | recriar secret |
| 1.2 Inngest | suíte Vitest do `apps/api` verde; evento chega na `BACKGROUND_QUEUE` | `git revert` |
| 1.3 Axiom | consultar Workers Logs e confirmar eventos com campos redigidos | `git revert` |
| 1.4 Logpush | job listado na API e objeto novo no bucket R2 | deletar job |
| 2 E-mail | cópia sombra chegando em `rafaelstarton@gmail.com` | `EMAIL_TRANSPORT=resend` |
| 3 Gráfico | rota retorna 404; suíte verde | `git revert` |

### Testes novos

- `redactPII` sobre payload clínico realista — passa a ser a única barreira entre dado de
  paciente e log persistido, e hoje não tem teste próprio
- `dispatch` do e-mail para cada valor de `EMAIL_TRANSPORT`, incluindo o caso em que o
  transporte sombra falha (não pode derrubar o envio principal)

## Resultado esperado

| Antes | Depois |
|---|---|
| Resend, Axiom, Grafana, Inngest (restos), quickchart, Sentry, PostHog | Sentry, PostHog |
| 5 secrets de fornecedor | 0 |
| 2 backends de log para o mesmo dado | Workers Logs + R2 |
| Log amostrado a 10% após migração | 100% |
