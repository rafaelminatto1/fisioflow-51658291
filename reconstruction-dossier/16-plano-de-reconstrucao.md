# 16 — Plano de Reconstrução (proposta — não executar sem autorização explícita)

> Roteiro para refazer o FisioFlow em repositório novo, preservando comportamento e regras (00–14) e corrigindo a dívida (14.G). **Nenhuma linha aqui autoriza início da implementação** — depende de aprovação posterior explícita.

## Princípios

1. **Paridade de comportamento**, não de código. Reescrever, não copiar.
2. **Deny-by-default** em auth; **RLS real** com role de runtime não-owner desde o dia 1.
3. **Schema único** (sem PT/EN duplicado), com ferramenta de migração com ledger no banco.
4. **Sem dados sensíveis no repo**, nunca.
5. Cada domínio entra com seus **testes de paridade** (13).

## Fase 0 — Fundações (antes de qualquer feature)

- Novo monorepo limpo (pnpm/Turborepo), 1 app web, 1 API, apps mobile decididos (ver 12/decisão RN×nativo).
- Auth unificado (1 mecanismo para web+pro+paciente).
- Migração com ledger (Drizzle Kit com tabela de controle **ou** Atlas); schema cobre 100% das tabelas (não 23/303).
- CI com gates: types, lint, testes, **deadcode**, **teste de isolamento RLS**, smoke pós-deploy.
- Role de runtime `app_runtime` (não owner) no Hyperdrive; RLS habilitado em todas as tabelas com dado de org.

## Fase 1 — Núcleo clínico (P1)

Organizações/RBAC → Pacientes/Prontuário → Agenda (recorrência, conflito 409, salas, bloqueios, feriados, booking público seguro) → Evolução (TipTap, autosave idempotente, colaboração Yjs, ditado, finalização/assinatura). Migração de dados de patients/appointments/sessions.

## Fase 2 — Financeiro e CRM (P1/P2)

Pacotes (consumo atômico, expiração lazy, renewal gate) → Pagamentos → Comissões → Recibos. CRM WhatsApp (inbox, janela 24h, templates Meta, opt-in/out, automações gated, lead score, roteamento) → Instagram → Webchat. Fechar buracos de auth financeiro/CRM (14.C-A5).

## Fase 3 — Exercícios, Tarefas, Relatórios (P2)

Biblioteca/HEP/protocolos → Tarefas/kanban (dependências, recorrência) → NPS → Relatórios/analytics.

## Fase 4 — IA e satélites (P2/P3)

Copilot, Evidence (PubMed), busca semântica, morning briefing. Decidir manter/refazer: Digital Twin, Biomecânica (hoje mock), Telemedicina (segura), Wearables, Gamificação, Wiki e NFS-e (nunca emitiu — validar necessidade). **Não reconstruir grupos/turmas**; antes do descarte, verificar somente dependências e eventual necessidade de exportação/arquivo dos dados legados.

## Fase 5 — Apps iOS

Conforme decisão de 12. Paridade offline com a web; push com preferências; limpeza no logout; Sentry ativo; universal links; pipeline de assinatura documentado (Linux→Action macOS→TestFlight).

## Ordem de dados

Ver 17. Resumo: referência → identidade → clínico → financeiro → CRM → satélites → logs.

## Critérios de "pronto" por domínio

- Todos os endpoints do domínio (de `api-endpoints.csv`) reimplementados ou explicitamente descartados.
- Todas as regras (de `business-rules.json`) do domínio com teste.
- Teste de isolamento RLS passando.
- Jornada E2E principal verde.
- Zero dado sensível no repo.

## Não-metas da reconstrução

- Não reproduzir órfãos (14.E), duplicidades PT/EN (14.D), RLS inerte (14.B), buracos de auth (14.C).
- Não migrar o database `gestao-saude` nem projetos Neon fora de escopo.
