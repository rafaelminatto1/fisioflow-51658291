# FisioFlow Analytics Dashboard

Reference for building analytics dashboards with the existing BI infrastructure.

---

## Architecture

### Route File
`apps/api/src/routes/analytics.ts` (~643 lines) — delegates to sub-modules:
- `./analytics/patient` — `registerPatientAnalyticsRoutes`
- `./analytics/ml` — `registerMlAnalyticsRoutes`

### Dashboard Endpoint
```
GET /api/analytics/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

---

## Metric Types (Strongly-Typed)

### PaymentTrendRow
```ts
interface PaymentTrendRow {
  day: string
  sum: string
}
```
Daily payment aggregation for revenue trend charts.

### FinancialPaymentRow
```ts
interface FinancialPaymentRow {
  forma_pagamento: string
  status: string
  total: string
}
```
Payment breakdown by method and status.

### PainRegionRow
```ts
interface PainRegionRow {
  name: string
  value: number
}
```
Pain region distribution for body map visualization.

### BiRevenueRow
```ts
interface BiRevenueRow {
  month: string
  sessions: number
  revenue: string
}
```
Monthly revenue with session count.

### BiOccupancyRow
```ts
interface BiOccupancyRow {
  booked: number
  total: number
}
```
Booking occupancy rate.

### BiRetentionRow
```ts
interface BiRetentionRow {
  retained: number
  total: number
}
```
Patient retention metrics.

### BiTherapistRow
```ts
interface BiTherapistRow {
  therapist_id: string
  therapist_name: string
  sessions_completed: number
  no_shows: number
  revenue: string
}
```
Therapist performance breakdown.

### BiStatusRow
```ts
interface BiStatusRow {
  status: string
  count: number
}
```
Appointment status distribution.

---

## Resilient Query Pattern

```ts
function queryWithFallback<T>(
  db: Pool,
  query: string,
  params: any[],
  fallback: T[]
): Promise<T[]> {
  return db.query(query, params).then(r => r.rows).catch(() => fallback)
}
```

Always use `queryWithFallback` for dashboard queries — gracefully degrades to empty results if a table/column is missing (e.g., during migrations).

---

## Database Sources

| Metric | Source Tables | Key Columns |
|---|---|---|
| Revenue trend | `pagamentos`, `transacoes` | `valor`, `pago_em`, `created_at` |
| Payment breakdown | `pagamentos` | `forma_pagamento`, `status`, `valor` |
| Pain regions | `pain_map_points`, `pain_maps` | `region`, `intensity` |
| Monthly revenue | `pagamentos`, `appointments` | `valor`, `date`, `status` |
| Occupancy | `appointments` | `status`, `date`, `start_time` |
| Retention | `patients`, `appointments` | `created_at`, first vs last appointment |
| Therapist perf | `appointments`, `profiles` | `therapist_id`, `status`, `payment_amount` |
| Status dist | `appointments` | `status`, `COUNT(*)` |

---

## Frontend Charts (Recharts)

Recommended chart types per metric:

| Metric | Chart Type | Recharts Component |
|---|---|---|
| Revenue trend | Area chart | `<AreaChart>` |
| Payment breakdown | Pie/Donut | `<PieChart>` |
| Pain regions | Body heatmap | Custom SVG + Recharts |
| Monthly revenue | Bar chart | `<BarChart>` |
| Occupancy | Gauge/Progress | Custom + `<Cell>` |
| Retention | Line chart | `<LineChart>` |
| Therapist perf | Horizontal bar | `<BarChart layout="vertical">` |
| Status dist | Pie | `<PieChart>` |

### Dashboard Component Pattern
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export function RevenueTrendCard({ data }: { data: PaymentTrendRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência de Receita</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="sum" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

## Date Range Filtering

All dashboard queries accept `startDate` and `endDate` query params. Use parameterized queries:

```ts
const startDate = c.req.query("startDate") ?? startOfMonth(new Date()).toISOString().split("T")[0]
const endDate = c.req.query("endDate") ?? endOfMonth(new Date()).toISOString().split("T")[0]
```

---

## Caching Strategy

Analytics data changes infrequently. Cache with:
- **KV**: `FISIOFLOW_CONFIG` KV namespace, TTL 5-15 minutes
- **Key pattern**: `analytics:v1:dashboard:{orgId}:{startDate}:{endDate}`
- **Invalidation**: On appointment/payment CRUD, invalidate via `c.executionCtx.waitUntil()`

---

## Export Features

For PDF/CSV export (competitive requirement):
- Use Cloudflare Browser Rendering for PDF generation
- CSV export via streaming response
- Date range selection for all exports
