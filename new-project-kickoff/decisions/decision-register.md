# Registro de decisões

Status: **Aceita**, **Proposta**, **Aberta**, **Rejeitada** ou **Substituída**.

## Decisões

| ID | Decisão | Status | Motivo / próximo passo |
|---|---|---|---|
| DEC-000 | Definir uso interno versus SaaS e o ICP | **Aceita** (2026-07-14) | proprietário decidiu **uso interno, clínica única, sem SaaS/revenda**; arquitetura permanece SaaS-ready só por isolamento/segurança (RLS + `organization_id`); billing/white-label/marketplace/self-service saem do roadmap próximo (reabrir gate se a decisão mudar); ver `product-discovery/DG-00-icp-e-modelo-de-uso.md` |
| DEC-001 | Excluir grupos/turmas e todo o fluxo coletivo | **Aceita** | decisão explícita do proprietário; não criar entidade, rota, flag ou placeholder |
| DEC-002 | Construir web desktop completo, app iPhone profissional e app iPhone paciente | **Aceita** | web é a superfície completa; cada app expõe capacidades adequadas à sua persona e não replica o web |
| DEC-003 | Priorizar web/fundação antes dos dois apps | **Aceita** | contratos, auth e modelo precisam estabilizar primeiro |
| DEC-004 | Cloudflare + Neon como baseline | **Aceita** | Neon transacional; Cloudflare Workers/Static Assets/R2/Queues/Workflows/Durable Objects conforme responsabilidade; atualizar ADR-0001 |
| DEC-005 | Plataforma modular híbrida | **Aceita** | monólito modular transacional + `public-edge`, `jobs-integrations`, `realtime`, `ai` e `telehealth` somente quando houver gate técnico; substitui a proposta de um único deployable; atualizar ADR-0002 |
| DEC-006 | Monorepo com contratos e regras compartilhados, UIs separadas | **Proposta forte** | três produtos, uma linguagem; ADR-0003 |
| DEC-007 | Schema canônico + Drizzle + um ledger de migrations + RLS real | **Proposta forte** | corrige drift e BYPASSRLS; ADR-0004 |
| DEC-008 | Um emissor de identidade para staff/paciente, audiences e memberships distintas | **Aceita** (2026-07-14) | **Better Auth** (self-hosted no Worker; usuários no Neon Postgres, compatível com RLS). **Paciente:** telefone, e-mail/magic link, Google e **Apple** (fluxo ID Token p/ app iOS). **Staff:** só e-mail. Audiences separadas. Motivo: Neon Auth gerenciado é o próprio Better Auth mas ainda **não oferece Apple** (só Google/GitHub/Vercel); Better Auth puro tem Apple hoje sem sair do ecossistema. OTP de telefone **preferir WhatsApp Business** (já contratado) sobre SMS pago. Clerk descartado (usuários fora do Neon, quebra RLS limpo). Ver ADR-0005 |
| DEC-009 | API `/api/v1` OpenAPI-first + SDK gerado | **Proposta forte** | impede deriva entre três clientes; ADR-0006 |
| DEC-010 | Outbox + Queues para eventos; Workflows para processos longos; DO somente para realtime ou coordenação stateful com átomo explícito | **Proposta forte** | evita DO global/genérico e permite single-flight por vínculo em efeitos externos; ADR-0006 |
| DEC-011 | Expo/React Native + EAS para os dois apps | **Proposta recomendada** | compatível com Linux, TestFlight e compartilhamento; ADR-0007 |
| DEC-012 | IA sempre revisável e nunca responsável pela assinatura clínica | **Proposta forte** | segurança clínica, ética e confiança; ADR-0008 |
| DEC-013 | Métrica norte de melhora clínica; abandono como métrica de equilíbrio separada | **Proposta** | validar instrumento, elegibilidade, janela, limiar clínico e baseline |
| DEC-014 | Manter todos os módulos completos no roadmap, entregues por incrementos | **Aceita** | inclui ERP, projetos/time tracking, marketing/site builder, commerce/inventory, gamificação, telemedicina, NFS-e, colaboração, IA/agentes, biomecânica, wearables e Digital Twin; entitlement não substitui authorization |
| DEC-015 | Reconstrução greenfield sem migrar os registros atuais | **Aceita** | os dados atuais não são reais; iniciar Neon/R2 novos com seeds sintéticos, preservando somente especificações, regras e evidências do legado |
| DEC-016 | Exigir recuperação antes do primeiro dado real | **Aceita** | ausência de backup do legado descartável não elimina PITR/backup, lifecycle/versionamento R2 e restore drill da nova produção |
| DEC-017 | Excluir DICOM/PACS | **Aceita** | não criar ingestão, worklist, viewer, study/series/instance ou integração correspondente; Documents continua aceitando arquivos clínicos comuns |
| DEC-018 | Conduzir UX/UI com LLM, Stitch e Figma MCP oficial | **Aceita** | Stitch explora alternativas; Figma é a fonte visual editável; skills implementam; DevTools/Playwright validam; somente dados sintéticos entram nas ferramentas |
| DEC-019 | Sincronizar continuamente o calendário do paciente por modelo híbrido gerenciado | **Aceita** — spec **aprovado pelo proprietário em 2026-07-14** | Google OAuth + calendário secundário, Outlook delegado + calendário separado e Apple por feed privado; unidirecional, discreto por padrão e integrante da Onda 1; design consolidado aprovado; plano de implementação por incrementos A–D em `delivery/plan-calendar-sync.md`; ver spec `docs/superpowers/specs/2026-07-14-sincronizacao-calendario-paciente-design.md` |

| DEC-020 | Visibilidade financeira por cargo | **Aceita** (2026-07-14) | Admin vê tudo. Fisioterapeuta e estagiário **não** veem relatórios financeiros, faturamento, comissões, fluxo de caixa nem painéis financeiros; **veem** apenas, por paciente: valor por sessão e status pago/não-pago das sessões daquele paciente. Enforcement por permissão na API + RLS/coluna, não só menu escondido |
| DEC-021 | Gerador do texto descritivo da NFS-e | **Aceita** (2026-07-14) | Emissão/integração de NFS-e adiada, mas o produto gera o **texto descritivo do serviço** a partir dos dados da clínica (paciente, CPF, procedimento, códigos TUSS, datas realizadas, valor por sessão e total, dados do profissional/conselho/empresa) para colar no sistema da contabilidade. A linha "Conforme Lei 12.741/2012 … ~9,05%" é acrescentada pelo sistema contábil (Contabilizei), não pelo FisioFlow. Modelo com placeholders em `delivery/nfse-service-text-spec.md`; nenhum dado real versionado |
| DEC-022 | Sem seleção de clínica; landing na agenda | **Aceita** (2026-07-14) | Como há uma única organização, não existe passo de escolher clínica após o login. Pós-login abre direto a **agenda da clínica inteira**. O contexto de organização é resolvido no servidor pela membership do usuário, nunca escolhido/enviado pelo cliente. O primeiro slice vira: login → agenda da clínica → lista de pacientes → detalhe read-only → testes de isolamento |

| DEC-023 | Telemedicina no Cloudflare Realtime (RealtimeKit) em vez de Jitsi | **Aceita** (2026-07-14) | SFU WebRTC na rede Cloudflare + UI Kit; sala controlada pelo backend (sem sala pública sem senha do legado, lacuna A12). Onda de telemedicina. Ver `05-revisao-tecnica-e-oportunidades.md` O1 |
| DEC-024 | Turnstile como baseline em toda superfície pública | **Aceita** (2026-07-14) | CAPTCHA invisível + Siteverify no Worker em login/OTP, reconexão de calendário, agendamento público e feed; corrige lacuna A4 (OTP sem rate limit/CAPTCHA). Recomendo aceitar já. O2 |
| DEC-025 | Cloudflare Images para mídia clínica e de exercícios | **Aceita** (2026-07-14) | suporte HEIC (fotos de iPhone), variantes/resize, Direct Creator Upload sem expor token. O3 |
| DEC-026 | Cloudflare Email Service para e-mail transacional | **Aceita** (2026-07-14) | `env.EMAIL.send()` no Worker cobre magic link/verificação/reset do Better Auth e notificações; reduz vendor externo. Recomendo aceitar já. O4 |
| DEC-027 | Cloudflare Containers para biomecânica/pose detection | **Aceita** (2026-07-14) | compute pesado (pose/vídeo) fora do Worker; destrava o módulo hoje mock. Onda A3. O5 |
| DEC-028 | OTP de login por WhatsApp (reuso da Meta) | **Aceita** (2026-07-14) | plugin de telefone do Better Auth envia o código pela WhatsApp Business API já contratada; SMS (Twilio) como reserva. Complementa DEC-008. O6 |
| DEC-029 | Transcrição de teleconsulta via Realtime → Workers AI | **Aceita** (2026-07-14) | adapter WebSocket do Realtime SFU entrega áudio (PCM) ao Worker/DO → transcrição alimenta a evolução, reusando o Voice Scribe/ditado. Onda de telemedicina, depois de DEC-023. O7 |
| DEC-030 | Cloudflare Access (Zero Trust) no Painel Admin | **Aceita** (2026-07-14) | camada extra de proteção nas telas administrativas mais sensíveis, além do RBAC + Better Auth. O8 |

## Gates antes do scaffold

Todos os gates `DG-00` a `DG-07` precisam estar resolvidos com resposta aprovada, owner e consequência registrada. Conta Apple e credenciais de produção podem ser provisionadas somente quando necessárias; no DG-03, o bloqueante do scaffold é a escolha da estratégia mobile/build e de seus owners.

| Gate | Decisão necessária | Recomendação | Owner |
|---|---|---|---|
| DG-00 | Definir modelo de uso, ICP, comprador, dores e alternativa atual | ✅ **Resolvido (2026-07-14): uso interno, clínica única, sem SaaS** — arquitetura SaaS-ready só por segurança; discovery de dores/baseline segue por observação sem bloquear arquitetura | proprietário + produto + responsável clínico |
| DG-01 | Registrar a decisão Cloudflare + Neon e definir região/contas do novo ambiente | ✅ **Resolvido (2026-07-14): Cloudflare + Neon confirmados** (região São Paulo/Brasil); atualizar/aceitar ADR-0001 | proprietário + engenharia |
| DG-02 | Escolher emissor de identidade e estratégia staff/paciente | ✅ **Resolvido (2026-07-14): Better Auth** (self-hosted, usuários no Neon/RLS); paciente por telefone/e-mail/Google/**Apple**, staff só e-mail, audiences separadas; OTP via WhatsApp preferível a SMS. Neon Auth gerenciado não tem Apple hoje (ver DEC-008) | engenharia + segurança |
| DG-03 | Confirmar Expo/EAS e caminho de build iOS a partir do Linux | ✅ **Resolvido (2026-07-14): Expo/EAS na nuvem, sem Mac necessário**; GitHub Actions dispara EAS Build/Submit; Mac é opcional só para debug nativo local, não bloqueia | proprietário + mobile |
| DG-04 | Definir papéis finais e permissões | ✅ **Resolvido (2026-07-14): manter 6 cargos**; admin vê tudo; fisioterapeuta e estagiário **não** acessam relatórios/painéis financeiros, mas **veem** valor por sessão do paciente e status pago/não-pago (ver DEC-020) | proprietário + responsável clínico |
| DG-05 | Definir a primeira tranche do ERP e o adapter/provedor inicial de NFS-e | ✅ **Parcial (2026-07-14): NFS-e adiada**, MAS incluir no escopo o **gerador do texto descritivo da nota** (varia paciente/TUSS/datas/valores) para colar no sistema da contabilidade; emissor de NFS-e escolhido depois (ver DEC-021) | proprietário + financeiro/contábil |
| DG-06 | Escolher observabilidade e política de dados/logs | ✅ **Resolvido (2026-07-14): Sentry aprovado, sem PII**; logs estruturados sem dado pessoal | engenharia + DPO |
| DG-07 | Aprovar primeiro slice e critérios de aceite | ✅ **Resolvido (2026-07-14): sem tela de seleção de clínica** (só existe a clínica do proprietário); após login abre direto a **agenda da clínica inteira**; contexto de organização resolvido no servidor, não escolhido pelo usuário (ver DEC-022) | produto + engenharia |

A conexão externa de Stitch/Figma não bloqueia o scaffold técnico. Antes de escrever em uma conta ou arquivo externo, confirmar projeto correto, escopos OAuth, owner, política de dados sintéticos e estratégia de exportação/versionamento dos tokens.

## Gates antes do primeiro dado real

- Neon/R2 de produção novos e vazios, sem dump/cópia dos registros atuais;
- dados de demonstração sintéticos identificados e removíveis;
- RLS/permissions/auditoria validados como roles reais;
- PITR/backup do Neon, lifecycle/versionamento R2 e restore integrado testados;
- resposta a incidente, retenção e consentimentos aprovados.

## Perguntas não bloqueantes do scaffold

- Qual incremento de telemedicina entra primeiro, qual provedor passa o spike e gravação será permitida?
- App paciente permite pedir novo horário ou só confirmar/cancelar/remarcar?
- Quais tipos de solicitação estruturada entram no v1 e qual o prazo de resposta operacional?
- Estagiário sempre exige revisão ou a política varia por organização?
- Qual conjunto inicial de PROMs/testes por especialidade?
- Existe parceiro ativo que justifique persona própria?
- Qual ordem comercial dos módulos completos e quais entitlements iniciais cada plano receberá?
