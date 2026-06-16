# Automation Executor (engine) — Design

**Data:** 2026-06-16
**Status:** Aprovado para planejamento
**Relacionado:** plano antigravity Fase 2.2

## Objetivo
Motor puro e testável que interpreta uma definição JSON de automação (DAG: trigger →
condition → action → wait) e a executa via dependências injetadas. Mais um endpoint
`POST /api/automation/simulate` para dry-run seguro (sem efeitos colaterais) usado pelo builder.

## Não-objetivos (YAGNI / follow-on)
- Classe `WorkflowEntrypoint` Cloudflare + binding wrangler + `step.sleep` durável.
- Persistência (`automations` table) e trigger a partir do event bus (queue).
- Action handlers reais (WhatsApp/email/task) — v1 usa handlers injetados; simulate é no-op.

## Arquitetura
- `lib/automation/types.ts` (Zod): `AutomationDefinition = { nodes, edges }`.
  - Node: `trigger{id}` | `condition{id,field,op,value?}` | `action{id,action,params?}` | `wait{id,seconds}`.
  - Edge: `{ from, to, branch? }` (`branch: "true"|"false"` para saídas de condition).
- `lib/automation/conditions.ts`: `evaluateCondition(cond, context)` puro (`eq/neq/gt/gte/lt/lte/contains/exists`, com dot-path em `field`).
- `lib/automation/runAutomation.ts`: `runAutomation(def, context, deps)` —
  parte do `trigger`, segue edges; `condition` ramifica por branch; `action` chama
  `deps.actions[name](params, context)`; `wait` chama `deps.sleep(seconds)`. Retorna
  `{ trace, steps, completed }`. `maxSteps` (default 50) previne loops.
- `routes/automation.ts`: `POST /simulate` (requireAuth) valida a definição (Zod) e roda
  `runAutomation` com **handlers no-op** (apenas registram) e `sleep` no-op → retorna o trace.
  Exporta `runSimulation(definition, context)` p/ teste.

## Testes
- `conditions`: cada operador + dot-path + ausente.
- `runAutomation`: trigger→action (handler chamado); condition true/false roteia certo;
  wait chama sleep; action desconhecida vira erro no trace (sem throw); guard de maxSteps em ciclo.
- rota: `runSimulation` com definição válida → trace; definição inválida → erro Zod.

## Critérios de sucesso
- `POST /api/automation/simulate` retorna trace determinístico para uma definição.
- Unit tests verdes; tsc/oxlint limpos. Zero efeitos colaterais no simulate.

## Follow-ons
WorkflowEntrypoint durável + binding; tabela `automations` + CRUD; trigger via queue/event bus;
action handlers reais; canvas React Flow (frontend).
