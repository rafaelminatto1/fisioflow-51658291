# Morning Briefing — Implementation Plan

> REQUIRED SUB-SKILL: subagent-driven-development or executing-plans.

**Goal:** `GET /api/briefing` — org-scoped daily digest (today's agenda, yesterday no-shows, inactive patients).

## Files
- `apps/api/src/lib/briefing/buildBriefing.ts` — pure aggregator
- `apps/api/src/lib/briefing/queries.ts` — `gatherBriefingData(sql, orgId)` via getRawSql
- `apps/api/src/routes/briefing.ts` — `GET /` + exported `getBriefing(env, user)`
- `apps/api/src/index.ts` — register `/api/briefing`
- `apps/api/src/lib/briefing/__tests__/*.test.ts`

## Task 1 — buildBriefing (TDD)
Pure: input `{ date, appointmentsToday: {status}[], noShowsYesterday, inactivePatients }` →
`{ date, total, countsByStatus, noShowsYesterday, inactivePatients, summary }`.
Commit `feat(briefing): pure aggregator`.

## Task 2 — queries (TDD, sql mocked)
`gatherBriefingData(sql, orgId)` runs 3 queries, returns raw for buildBriefing.
Commit `feat(briefing): query layer`.

## Task 3 — route + register (TDD via exported getBriefing)
`getBriefing(env, user)` = buildBriefing(await gatherBriefingData(getRawSql(env,'read'), user.organizationId)).
`GET /` requireAuth + rateLimit. Register in index.ts.
Commit `feat(briefing): GET /api/briefing`.

## Task 4 — verify
vitest + tsc + oxlint + full suite. Deploy via merge.

## Self-review
Pure aggregator tested; queries org-scoped; cron/dispatch deferred.
