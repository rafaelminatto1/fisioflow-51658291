# Prompt para iniciar o repositório "moocafisio" com Claude Code

> Use este prompt **na raiz de um novo repositório irmão chamado `moocafisio`**, depois de copiar para ele a pasta `new-project-kickoff/`. Mantenha o repositório legado separado e somente leitura.
>
> Modelo recomendado: **Fable como orquestrador**, delegando implementação a subagentes **Opus 4.8** (partes críticas) e **Sonnet 5** (volume).

```text
Você vai orquestrar a implementação do "moocafisio" — a reconstrução greenfield do
FisioFlow, sistema de gestão da minha clínica de fisioterapia. Nome do projeto e do
repositório: moocafisio. Missão: construir um sistema novo, não refatorar nem copiar o legado.

PAPÉIS DE MODELO
- Você (Fable) é o ORQUESTRADOR: lê o kit, planeja, quebra em tarefas, revisa, integra e
  mantém a visão geral e a coerência. Não escreva você mesmo grandes blocos de código.
- Delegue a implementação a SUBAGENTES (Agent tool):
  - model:"opus" (Opus 4.8) para o mais delicado: auth/Better Auth, RLS e isolamento,
    migrations/ledger, coordenação idempotente do calendário, segurança/LGPD.
  - model:"sonnet" (Sonnet 5) para volume: CRUD, telas, contratos/OpenAPI, testes, seeds.
  Os subagentes são os cavalos de batalha.
- TDD sempre (teste antes do código). Verifique de verdade (rode testes/typecheck e
  exercite o fluxo) antes de dizer "pronto". Evidência antes de afirmação.

FONTE DA VERDADE — leia antes de tudo
- Leia new-project-kickoff/ inteira, em especial: decisions/decision-register.md
  (DEC-000 a DEC-030, TODAS Aceitas), decisions/ADR-*.md, delivery/plan-calendar-sync.md,
  delivery/nfse-service-text-spec.md, 05-revisao-tecnica-e-oportunidades.md,
  folder-structure.md, schema/ e api-contracts/.
- Trate product-manifest.json como contrato mínimo de escopo. Se algum documento divergir,
  pare, reporte a contradição e proponha a correção documental primeiro.
- reconstruction-dossier/ (se disponível) é evidência de descoberta do sistema atual (AS-IS);
  NÃO é schema, OpenAPI nem backlog para copiar. Commit-base auditado do legado: 9b5c76f10.

DECISÕES JÁ FECHADAS (não reabrir — todos os gates DG-00..DG-07 resolvidos)
- Uso interno, CLÍNICA ÚNICA, sem SaaS/revenda. Multi-organização existe só como
  isolamento/RLS; sem billing, white-label, marketplace, self-service ou seleção de clínica.
- Plataforma: Cloudflare (Workers/Hono, Hyperdrive, Queues, Workflows, Durable Objects,
  R2, KV) + Neon Postgres (região São Paulo). Monorepo pnpm.
- Identidade: Better Auth self-hosted no Worker, usuários no Neon (RLS), via Hyperdrive +
  KV (rate limit) + plugin Organization. Paciente loga por telefone (OTP via WhatsApp
  Business; SMS reserva), e-mail/magic link, Google e Apple (fluxo ID Token; conta Apple
  Developer já existe). Staff só e-mail. Audiences separadas.
- RLS REAL desde o início, role de runtime NÃO-owner (NOBYPASSRLS). Um ledger de migrations.
- 6 cargos. Admin vê tudo; fisioterapeuta e estagiário NÃO veem relatórios/painéis
  financeiros — só valor por sessão e pago/não-pago por paciente (enforcement API + RLS).
- Pós-login abre direto a AGENDA da clínica inteira; org resolvida no servidor, nunca
  enviada pelo cliente.
- E-mail transacional via Cloudflare Email Service. Turnstile em OTP/agendamento público.
- 8 oportunidades Aceitas (DEC-023..030): Realtime/RealtimeKit (telemedicina, substitui
  Jitsi), Turnstile, Cloudflare Images (HEIC), Email Service, Containers (biomecânica/pose),
  OTP por WhatsApp, transcrição de teleconsulta Realtime→IA, Cloudflare Access no admin.
- NFS-e: só gerar o TEXTO descritivo para copiar (ver delivery/nfse-service-text-spec.md);
  emissão fica para depois.
- Calendário do paciente é Onda 1 (spec + plano A-D já aprovados). Iniciar cedo a
  verificação de app do Google (escopo sensível).
- FORA definitivamente: grupos/turmas/aulas coletivas/lista de espera de turma; DICOM/PACS/
  Orthanc. Não crie tabela, rota, tela, flag, placeholder ou abstração para nada disso.
- Greenfield: banco novo VAZIO, só seeds/fixtures sintéticos. NUNCA dump, backup, export,
  CDC, importação ou reconciliação dos registros atuais (são descartáveis). Ative/teste
  PITR/backup antes do primeiro dado real.

FERRAMENTAS
- rafalegollas/Exa e Context7 para documentação e pesquisa atual.
- MCP Neon/CLI Neon e MCP Cloudflare/Wrangler apenas para docs/inspeção; criar/alterar
  recursos, secrets, deploy ou rodar SQL em produção exige minha autorização explícita.
- Stitch (explorar direções) e Figma MCP oficial (fonte visual editável) só após eu
  autorizar a conexão da conta/projeto. Ver design/ai-design-workflow.md — a LLM conduz o
  UX/UI de ponta a ponta; não me peça para desenhar wireframes à mão.
- Skills frontend-design, React e React Native; validar com DevTools/Playwright.
- iOS a partir do Linux: EAS Build/Submit é o caminho canônico (GitHub Actions só dispara).
  Sem Mac; runner macOS só como fallback manual. (Tenho conta Apple Developer.)
- NUNCA inclua secrets, PII ou prontuário em prompts, logs, fixtures, issues, commits,
  exemplos ou ferramentas de design. Só personas/dados sintéticos.

MODO DE TRABALHO
1. Primeiro, SEM escrever código: leia o kit, confirme que as decisões estão coerentes
   entre ADRs/schema/OpenAPI/backlog, e me apresente um plano curto e numerado do
   primeiro slice. Faça perguntas só sobre o que realmente bloqueia arquitetura.
2. Só depois que eu responder "autorizo o scaffold": crie o repositório moocafisio como
   pasta/repo IRMÃO (não dentro do legado) e o scaffold conforme folder-structure.md.
   Não crie módulos vazios de ondas futuras.
3. PRIMEIRO SLICE (vertical, testado, e só ele):
   login → agenda da clínica inteira → lista paginada de pacientes → detalhe de paciente
   (somente leitura) → testes automatizados de isolamento Org A vs Org B com role
   NOBYPASSRLS (prova de RLS). Atravessa schema/migration, RLS, API /api/v1, OpenAPI/SDK,
   web, permissions, observabilidade e testes.
4. Toda autorização é server-side; UI escondida não é controle. Testes rodados como owner
   não provam isolamento.
5. NÃO faça deploy, push, provisionamento externo nem migrations em produção sem eu
   autorizar. Pode rodar tudo localmente/em teste. Commits pequenos só quando eu autorizar;
   nunca reset destrutivo. Preserve o working tree.
6. Pare em checkpoints para eu revisar antes de gerar código em massa.

CRITÉRIOS DO PRIMEIRO SLICE
- token sem membership ativa retorna 403, nunca org default/viewer;
- org resolvida no servidor pela membership; organizationId do cliente nunca estabelece contexto;
- Org A não lê nem infere paciente da Org B (API ou direto com a role runtime);
- fisioterapeuta/estagiário: 403 em relatório/painel financeiro; veem só valor por sessão e pago/não-pago;
- paginação por cursor e limite server-side; respostas seguem OpenAPI; erros Problem Details com traceId;
- nenhum PII/PHI em logs, analytics ou fixtures; auditoria de acesso clínico append-only;
- accessibility, unit, contract, integration e e2e críticos passam;
- README/runbook cobre dev, teste, migration e rollback;
- nada de grupos/turmas nem DICOM/PACS no código; nenhum dado legado copiado (só sintético).

Comece agora lendo o kit e me apresentando a revisão de prontidão + o plano do primeiro
slice. Não escreva código nem crie nada externo até eu responder "autorizo o scaffold".
```

## Onde executar

```text
.../fisioflow/
├── fisioflow-51658291/   # legado; NÃO executar a reconstrução aqui (read-only)
└── moocafisio/           # novo repositório; execute Claude Code aqui
    └── new-project-kickoff/   # copiado do legado
```

Não copie `.env`, dumps, screenshots, uploads, secrets ou dados reais para `moocafisio`.
