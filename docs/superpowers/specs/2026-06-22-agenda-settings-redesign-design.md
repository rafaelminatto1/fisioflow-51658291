# Redesign da página de Configurações da Agenda (`/agenda/settings`)

**Data:** 2026-06-22
**Autor:** Rafael Minatto (com Claude)
**Status:** Aprovado para planejamento

## Problema

A página `/agenda/settings` (`src/pages/ScheduleSettings.tsx`, estrutura `settings-v2`) tem dois problemas confirmados pelo usuário:

1. **Não salva alterações** — o usuário edita, mas o salvamento falha ou não persiste de forma consistente.
2. **Layout/UX ruim** — visual confuso, fora do design system do projeto (usa `teal-600` em vez do azul Activity + Nunito; superfícies que não seguem o padrão sólido sem glass).

Diagnóstico estrutural já levantado:
- O backend está montado corretamente: `apps/api/src/routes/scheduling-settings.ts` → `settingsRoutes` montado em `/api/scheduling` via `scheduling.ts` (`app.route("/", settingsRoutes)`). Rotas `/api/scheduling/settings/*` existem e têm RLS (migrations 0057, 0100, 0121).
- O salvamento na UI é **fragmentado**: cada subseção tem seu próprio estado `dirty` e botão isolado (ex.: `PoliticasTab` mantém `bookingDirty` e `noShowDirty` separados). Isso é, ao mesmo tempo, fonte de confusão de UX e de bugs de "salvei mas não persistiu".
- Existe **código morto/duplicado**: pasta `src/components/schedule/settings/` (v1) coexiste com `settings-v2/`; há dois exports `schedulingApi` (em `src/api/v2/appointments.ts` e `src/api/v2/scheduling.ts`).

## Objetivo

Refazer a página de configurações da agenda do zero (UI + estado de salvamento), corrigir o bug de "não salva", alinhar ao design system (azul Activity, Nunito, superfícies sólidas, sem glass) e remover o código legado. Reaproveitar os hooks de dados existentes.

## Não-objetivos (YAGNI)

- Não reescrever os hooks de dados (`useScheduleSettings`, `useScheduleCapacity`, `useStatusConfig`, `useAppointmentTypes`, `useAgendaAppearancePersistence`) nem o backend, exceto a correção pontual do "não salva".
- Não adicionar novos domínios de configuração além dos já existentes.
- Não migrar a persistência de Aparência (client-side / localStorage) para o servidor.

## Decisões do usuário

1. **Consolidar** as 8 abas em menos abas (~5 grupos lógicos).
2. **Stitch** = referência de layout; implementação nos componentes React/Tailwind/Shadcn do projeto.
3. **Limpar** código legado: remover v1 (`settings/`), tabs não usadas e `schedulingApi` duplicado.

## Domínios de dados (mapeamento atual)

| Aba atual    | Hook / fonte                                          | Persistência |
| ------------ | ----------------------------------------------------- | ------------ |
| Visão geral  | agrega tudo                                           | leitura      |
| Horários     | `useScheduleSettings` (businessHours)                 | servidor     |
| Capacidade   | `useScheduleCapacity` (vagas + slot/intervalo)        | servidor     |
| Status       | `useStatusConfig` (cores dos estados)                 | servidor     |
| Tipos        | `useAppointmentTypes` (serviços + durações)           | servidor     |
| Bloqueios    | `useScheduleSettings` (blockedTimes)                  | servidor     |
| Políticas    | `useScheduleSettings` + bookingWindow + noShow        | servidor     |
| Aparência    | `useAgendaAppearancePersistence` + `localStorage`     | **cliente**  |

## Design

### 1. Navegação consolidada (8 → 5 abas + faixa de visão geral)

A "Visão geral" deixa de ser aba e vira uma **faixa compacta persistente** no topo (saúde da config + atalhos para as abas).

Abas consolidadas:

1. **Funcionamento** — Horários de expediente + Intervalo de slots + Capacidade (vagas) + Janela de agendamento.
2. **Atendimentos** — Tipos de serviço (durações) + Status (cores/estados).
3. **Disponibilidade** — Bloqueios, folgas e feriados.
4. **Políticas** — Cancelamento + No-show + Notificações/lembretes.
5. **Aparência** — Densidade/visual do calendário (client-side).

Agrupamento por intenção do usuário: "quando atendo" / "o que ofereço" / "quando não atendo" / "regras" / "como vejo".

A navegação adota azul Activity + Nunito + superfícies sólidas (substitui o `teal-600` atual).

URLs antigas (`?tab=horarios`, `?tab=capacidade`, `?tab=status`, `?tab=tipos`, `?tab=bloqueios`, `?tab=politicas`, `?tab=aparencia`, e os `LEGACY_REDIRECTS` existentes) redirecionam para a nova aba correspondente, para não quebrar links salvos.

### 2. Padrão unificado de salvamento (núcleo do fix de UX)

- **Um único rodapé sticky por aba**: "Salvar alterações" + "Descartar", visível apenas quando há mudança (`isDirty` agregado de toda a aba, não por subseção).
- **Estados explícitos**: idle → salvando (spinner) → salvo (✓ "Salvo às HH:mm") → erro (toast com a mensagem real do servidor; nunca falha silenciosa).
- **Guarda de navegação**: ao trocar de aba com alterações não salvas, confirmar antes de descartar.
- Hooks de dados permanecem; muda apenas a camada de UI/estado de salvamento.

### 3. Correção do "não salva" (investigação dirigida)

Usar systematic-debugging contra o Neon ao vivo + logs do Worker antes de qualquer correção. Hipóteses ordenadas por probabilidade:

1. **RLS em escrita** — GET usa cache D1 (funciona), mas INSERT/UPDATE exige `app.org_id` no contexto da sessão; se não setado, o write é rejeitado. Migrations 0100/0121 já foram correções de RLS/upsert → padrão recorrente.
2. **Mismatch de coluna** no upsert de `cancellation_rules` (insere `min_hours_notice` e `min_hours_before` simultaneamente) — se a tabela não tiver ambas, retorna 500.
3. **Erro engolido no frontend** — toast de erro pode não estar disparando, dando impressão de sucesso.

A causa real será confirmada (não assumida) antes do fix.

### 4. Uso do Stitch

Criar projeto no Stitch e gerar mockups das 5 abas + faixa de visão geral com brief: azul Activity, Nunito, superfícies sólidas, sem glass, densidade adequada a um app clínico. Usar como referência de layout/hierarquia/espaçamento; implementar com os componentes do projeto. O Stitch não substitui o design system.

### 5. Limpeza de código morto

- Deletar `src/components/schedule/settings/` (v1) e tabs/managers não referenciados após o redesign.
- Remover o `schedulingApi` duplicado em `src/api/v2/appointments.ts` (manter o de `scheduling.ts`).
- Remover entradas órfãs de `LEGACY_REDIRECTS` após consolidação (mantendo os redirects de URL antiga → nova aba).
- Atualizar/validar os testes existentes: `AgendaSettingsPage.test.tsx`, `ScheduleSettings.test.ts`, `ViewAppearancePanel.test.tsx`, `useAgendaAppearancePersistence.test.ts`.

## Arquitetura de componentes (alvo)

- `src/pages/ScheduleSettings.tsx` — shell: `PageLayout` + faixa de visão geral + navegação de 5 abas + roteamento por `?tab=`.
- `src/components/schedule/settings/` (reconstruída do zero, nome canônico após remover a v1):
  - `OverviewStrip.tsx` — faixa de saúde da config.
  - `SettingsNav.tsx` — navegação (desktop sidebar + sheet mobile).
  - `useTabDirtyState` — hook utilitário para `isDirty` agregado + guarda de navegação.
  - `SettingsSaveBar.tsx` — rodapé sticky reutilizável (estados idle/salvando/salvo/erro).
  - Abas: `FuncionamentoTab.tsx`, `AtendimentosTab.tsx`, `DisponibilidadeTab.tsx`, `PoliticasTab.tsx`, `AparenciaTab.tsx`.
- Hooks de dados reaproveitados sem mudança de assinatura.

Cada unidade tem propósito único, interface clara e é testável isoladamente: a SaveBar não conhece domínios; cada aba expõe `{ isDirty, save, discard }` consumido pela SaveBar.

## Testes

- Unit: `useTabDirtyState` (agregação dirty, reset pós-save), redirects de URL legada → nova aba.
- Componente: cada aba renderiza, marca dirty ao editar, chama o `save` correto, mostra estado salvo e erro.
- Integração do fix: teste do endpoint que falhava (após root-cause), confirmando persistência.
- Regressão: manter/atualizar os testes existentes citados acima.

## Riscos

- A causa do "não salva" pode exigir migration (ex.: ajuste de RLS ou coluna). Se destrutivo, criar `.down.sql`.
- Consolidar abas pode esconder uma configuração que algum usuário acessava por URL direta → mitigado pelos redirects.
- Aparência é client-side; não confundir seu "salvar" (localStorage) com o padrão de save do servidor das outras abas.
