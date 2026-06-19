# Overdue Payments Endpoint Design

## Context

The dashboard widget `OverduePaymentsAlert` calls `GET /api/clinic-metrics/overdue-payments`.
The current backend implementation in `apps/api/src/routes/clinicMetrics.ts` returns HTTP 500 in production because it mixes incompatible payment schemas:

- filters pending rows using `payments.paid_at < CURRENT_DATE`
- references `payment_date` in the summary query
- reads `overdue_total_cents` in the response mapper even though the query selects `overdue_total`

This endpoint is intended to power a collection-focused dashboard card showing overdue receivables by patient.

## Goal

Replace the broken implementation with a production-safe endpoint that:

- uses the correct source of truth for overdue receivables
- preserves the response shape expected by the current frontend widget
- returns consistent monetary and date fields
- avoids patient rows that cannot be actioned from the UI

## Non-Goals

- redesigning the dashboard widget
- unifying every financial endpoint in the codebase
- migrating unrelated analytics routes away from their current tables

## Recommended Approach

Use `contas_financeiras` as the sole data source for overdue receivables in this endpoint.

Rationale:

- it already models receivables with due dates and statuses used by the financial analytics routes
- it supports the actual overdue rule: due date before today
- it avoids relying on `payments`, which is better suited for executed payment records

## Data Rules

The endpoint will query only rows that satisfy all of the following:

- `organization_id = current organization`
- `deleted_at IS NULL`
- `tipo IN ('receber', 'receita')`
- `status IN ('pendente', 'atrasado')`
- `COALESCE(data_vencimento, created_at::date) < CURRENT_DATE`
- `patient_id IS NOT NULL`

Rows without a linked patient are excluded from the patient list because the widget exposes a direct collection CTA and needs a real recipient.

## Response Contract

The endpoint keeps the existing top-level structure:

```json
{
  "data": {
    "patients": [],
    "summary": {}
  }
}
```

Patient rows will include:

- `patient_id: string`
- `full_name: string`
- `phone: string | null`
- `whatsapp: string | null`
- `overdue_count: number`
- `overdue_total: number`
- `oldest_overdue_date: string`

Summary will include:

- `total_patients: number`
- `total_overdue: number`

Compatibility note:

- the current widget already treats `summary.total_overdue` as a currency amount, so that field will remain monetary
- if the widget still references older naming, the backend may include additional aliases only if needed after verification

## Query Shape

The patient aggregation should:

- group by patient
- sum `valor` into `overdue_total`
- count overdue receivables into `overdue_count`
- take `MIN(COALESCE(data_vencimento, created_at::date))` as `oldest_overdue_date`
- order by `overdue_total DESC`, then oldest overdue first

The summary query should:

- count distinct patients with overdue receivables as `total_patients`
- sum overdue receivable value as `total_overdue`

## Frontend Impact

`src/components/dashboard/OverduePaymentsAlert.tsx` should be verified against the corrected response contract.

Expected outcome:

- no code changes if it already consumes `patients` and `summary.total_overdue`
- small type correction if the summary interface still uses an obsolete key such as `total_appointments`

## Error Handling

The route should:

- keep the authenticated tenant scope
- return `500` only for real execution failures
- log the error with the existing `[Metrics] Overdue Payments error:` prefix
- return an empty successful payload when no overdue receivables exist

## Validation and Tests

Implementation should include:

- one backend test covering overdue receivable aggregation from `contas_financeiras`
- one assertion that an empty dataset returns `patients: []` and zeroed summary
- one frontend type adjustment if needed so the widget contract matches the route

## Risks

- some organizations may still have overdue values represented outside `contas_financeiras`; this design intentionally chooses consistency over hybrid fallback complexity
- excluding rows without `patient_id` may reduce totals compared with raw finance reports, but keeps the widget operationally actionable

## Acceptance Criteria

- `GET /api/clinic-metrics/overdue-payments` no longer returns HTTP 500 for valid authenticated users
- the endpoint returns overdue receivables based on `contas_financeiras`
- the dashboard widget renders overdue patients and total overdue amount without schema mismatches
- no reference remains to invalid aliases such as `overdue_total_cents` in this flow
