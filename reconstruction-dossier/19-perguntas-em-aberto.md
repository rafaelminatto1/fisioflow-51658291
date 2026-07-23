# 19 — Perguntas em Aberto

> Itens que exigem decisão ou validação humana antes/durante a reconstrução. Cada um tem impacto e onde impacta.

## Banco / dados

- **QA-DB-01** — `profiles`=1 linha vs ~5 papéis ativos e usuários reais. A identidade vive em `neon_auth.user`? Como `profiles` se relaciona? Impacta migração de identidade e FKs de autoria. **(alto)**
- **QA-DB-02** — Semântica de `nao_atendido_sem_cobranca` no enum de status (afeta financeiro/comissão). Necessária para o mapa de-para de migração.
- **QA-DB-03** — Migrar ou descartar o trilho legado `whatsapp_*` (paralelo a `wa_*`)? E as 8 tabelas órfãs?
- **QA-DB-04** — O database `gestao-saude` no branch de produção do FisioFlow: remover/isolar? Confirmar que não é dependência.

## Infraestrutura

- **QA-INF-01** — Como o `VoiceScribeAgent` (ditado Nova-3) autentica? Não há secret Deepgram no `fisioflow-api`. Provedor/rota do STT?
- **QA-INF-02** — Destino e retenção do `db-backup.yml` (para onde vai o backup? R2? off-site?).
- **QA-INF-03** — R2 `fisioflow-files` e KV `CONFIG_KV`/`SESSION_KV`: em uso (via S3/API direta) ou órfãos?
- **QA-INF-04** — Secret `DATABASE_URL` no `fisioflow-web` (asset worker): remover?
- **QA-INF-05** — Projeto Neon `fisioflow-production` (us-east-1) e Workers de outros projetos na conta: limpar?

## Segurança (decisões de prioridade)

- **QA-SEC-01** — Fechar imediatamente (mesmo antes da reconstrução) os endpoints sem auth `POST /api/agents/*` e `/api/whatsapp/admin/*`? São riscos ativos em produção. **(crítico)**
- **QA-SEC-02** — Ativar RLS real com role `app_runtime` no Hyperdrive de prod é mudança arriscada no sistema atual — fazer só na reconstrução ou também mitigar no atual?
- **QA-SEC-03** — MFA: implementar de verdade ou remover a UI decorativa?

## Produto / escopo

- **QA-PROD-01** — Biomecânica (hoje mock): manter, refazer de verdade, ou cortar?
- **QA-PROD-02** — NFS-e nunca emitiu (0 registros): é requisito real? Manter cert mTLS/workflow?
- **QA-PROD-03** — Telemedicina: LiveKit (secrets existem) vs Jitsi (sala pública) — qual é o caminho?
- **QA-PROD-04** — Digital Twin e Wearables: manter na reconstrução? **Grupos/turmas foram resolvidos como fora do escopo e sem previsão pelo proprietário em 2026-07-13.**
- **QA-PROD-05** — Fluxo `under_review` (estagiário→supervisor) na evolução: implementar (enum existe, API não)?

## Mobile

- **QA-MOB-01** — Idempotência das mutações reenfileiradas offline: existe? (não verificado)
- **QA-MOB-02** — Decisão React Native/Expo vs SwiftUI nativo para os apps (ver 12) — dado que compartilham ~zero com a web.
- **QA-MOB-03** — Sentry mudo nos IPAs: confirmar e corrigir DSN no build.

## E-Fisio

- **QA-EFISIO-01** — Autorização/licença/robots da e-fisio.wiki.br para eventual integração (fase futura).

## Runtime (lacuna metodológica)

- **QA-RUN-01** — Fase 3 runtime foi executada parcialmente como `admin` (`RUN-001..011`). Ainda é necessário validar, preferencialmente em staging com dados de teste, o enforcement real para fisioterapeuta, estagiário, recepcionista e paciente, além de estados de erro/permissão.
