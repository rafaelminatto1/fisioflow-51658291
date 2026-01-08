# Dynamic Compare Feature

## Overview
The **Dynamic Compare** feature uses a Schema-First approach. All data structures are defined in a single source of truth: `schemas/dynamic_compare_metrics.schema.json`.

## Workflow
1. **Edit Schema**: Modify `schemas/dynamic_compare_metrics.schema.json`.
2. **Generate Code**: Run `npm run gen:all`.
   - This updates TypeScript types in `src/generated/types`.
   - This updates Zod schemas in `src/generated/zod`.
3. **Use in Code**: Import types/schemas from `src/generated`.

## Validation
- **Backend (AJV)**: `src/lib/validation/ajv.ts` (Rules enforced).
- **Frontend (Zod)**: `src/lib/validation/dynamicCompare.ts` (Type safety + casting).

## Adding a New Metric
1. Open `schemas/dynamic_compare_metrics.schema.json`.
2. (Optional) If it's a new structure, update strict type definitions.
3. Generally, `metric_deltas` is generic, so just ensuring the data sent matches the `MetricDelta` definition is enough.
4. Run `npm run gen:all`.

## Tests
Run `npm test` or `npx vitest` to check validation logic.
Tests located in: `tests/dynamicCompare.validation.test.ts`.
