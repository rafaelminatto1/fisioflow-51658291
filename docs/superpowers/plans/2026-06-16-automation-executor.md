# Automation Executor (engine) — Implementation Plan

> REQUIRED SUB-SKILL: subagent-driven-development or executing-plans.

**Goal:** Pure DAG automation engine + safe `POST /api/automation/simulate` dry-run.

## Files
- `apps/api/src/lib/automation/types.ts` — Zod `AutomationDefinition`
- `apps/api/src/lib/automation/conditions.ts` — `evaluateCondition`
- `apps/api/src/lib/automation/runAutomation.ts` — graph executor (injected deps)
- `apps/api/src/routes/automation.ts` — add `POST /simulate` + `runSimulation`
- `apps/api/src/lib/automation/__tests__/*.test.ts`

## Task 1 — types.ts (Zod). Commit.
## Task 2 — conditions.ts (TDD: ops + dot-path). Commit.
## Task 3 — runAutomation.ts (TDD: action/condition-branch/wait/unknown/maxSteps). Commit.
## Task 4 — route /simulate + runSimulation (TDD). Register exists (automation route already mounted). Commit.
## Task 5 — verify (vitest+tsc+oxlint+full suite). Deploy via merge.

## Self-review
Pure engine fully tested; simulate has no side effects; durable Workflow + persistence + triggers deferred.
