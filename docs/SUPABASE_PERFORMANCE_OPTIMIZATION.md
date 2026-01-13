# Supabase Performance Optimization Guide

This document outlines the performance optimizations implemented for the fisioflow project's Supabase integration.

## 📊 Summary of Improvements

### 1. Database Indexes (Migration: `20260113140000`)

New indexes added for critical queries:

#### Organization-Based Filtering (Critical for Multi-Tenant)
- `idx_appointments_organization_id` - Filters by org
- `idx_appointments_org_date` - Org + date composite
- `idx_appointments_org_status` - Org + status composite
- `idx_patients_organization_id` - Patient org filtering
- `idx_profiles_organization_id` - Profile org filtering

#### Common Query Patterns
- `idx_appointments_therapist_date_status` - Therapist dashboard queries
- `idx_appointments_patient_date_status` - Patient history queries
- `idx_appointments_today` - Today's appointments (partial index)
- `idx_appointments_date_range` - Date range queries

#### Realtime Optimization
- `idx_appointments_realtime_filter` - Optimized for Realtime subscriptions

#### Other Tables
- Medical records, SOAP records, payments, transactions
- Exercise protocols and plans
- Full-text search indexes with GIN (patient names)

### 2. Materialized Views

- `mv_daily_appointment_metrics` - Pre-aggregated daily metrics for dashboard
- Refresh function: `refresh_daily_metrics()`

### 3. Performance Monitoring Functions

- `get_slow_queries(min_calls, min_ms)` - Identify slow queries
- `analyze_performance_tables()` - Update table statistics

## 🚀 How to Apply

### Step 1: Apply the Migration

```bash
# Using Supabase CLI
supabase db push

# Or apply manually via Supabase Dashboard
# Copy content of: supabase/migrations/20260113140000_performance_optimization.sql
```

### Step 2: Run Diagnostics

```bash
# Install dependencies
npm install -D tsx

# Run diagnostics script
npx tsx scripts/diagnose-supabase.ts
```

### Step 3: Monitor Performance

The `PerformanceDashboard` component shows real-time metrics:

```tsx
import { PerformanceDashboard } from '@/components/system';

// Add to your dev-only routes
{import.meta.env.DEV && <PerformanceDashboard />}
```

## 📈 Using the Optimized Hooks

### useOptimizedQuery

Automatic caching with configurable TTL:

```tsx
import { useOptimizedQuery } from '@/hooks/database/useOptimizedQuery';

const { data, isLoading, error, refetch } = useOptimizedQuery({
  table: 'appointments',
  columns: 'id, date, status, patient_id',
  filter: { column: 'organization_id', operator: 'eq', value: orgId },
  orderBy: { column: 'date', ascending: true },
  limit: 50,
  cacheTtl: 60000, // 1 minute
  enabled: !!orgId,
});
```

### usePaginatedQuery

For large datasets:

```tsx
import { usePaginatedQuery } from '@/hooks/database/useOptimizedQuery';

const {
  data,
  currentPage,
  totalPages,
  nextPage,
  previousPage
} = usePaginatedQuery({
  table: 'patients',
  columns: 'id, full_name, email',
  pageSize: 20,
});
```

### Performance Tracking

```tsx
import { PerformanceMonitor } from '@/lib/database/performanceMonitor';

// Track query performance
const data = await PerformanceMonitor.trackQuery(
  'fetch-appointments',
  () => supabase.from('appointments').select('*'),
  1000 // threshold in ms
);

// Get slow queries
const slowQueries = await PerformanceMonitor.getSlowQueries(5, 100);

// Generate performance report
const report = await PerformanceMonitor.generatePerformanceReport();
```

## 🔧 pgBouncer Configuration

Supabase includes pgBouncer by default. Here's how to verify:

### Check Connection Pooling

```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_stat_activity WHERE application_name LIKE 'pgbouncer%';
```

### Recommended Settings

For transaction pooling mode (default on Supabase):

```env
# Already configured by Supabase
# No changes needed typically
```

## 📊 Realtime Optimizations

The `RealtimeContext` has been optimized:

1. **Batch updates** - Multiple rapid changes are processed together
2. **Debounce** - Metrics calculation debounced to 300ms
3. **Date filtering** - Only future/recent appointments kept in memory
4. **Channel naming** - Unique channels per organization to avoid conflicts

## 🎯 Key Performance Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Avg query time | < 100ms | See dashboard |
| Cache hit rate | > 70% | See dashboard |
| Slow queries | 0 | See dashboard |
| Realtime latency | < 500ms | See logs |

## 🛠️ Troubleshooting

### Queries still slow after optimization?

1. **Check row counts**: Large tables (>100K rows) may need partitioning
2. **Analyze with EXPLAIN**: Use `EXPLAIN ANALYZE` on slow queries
3. **Review RLS policies**: Complex RLS can impact performance
4. **Check network latency**: Supabase region vs user location

### Cache not working?

1. Verify cache TTL settings
2. Check `invalidateQueryCache()` calls
3. Ensure cache key generation is consistent

### Realtime not updating?

1. Check channel subscription status in logs
2. Verify organization_id filter
3. Check Supabase Realtime limits (100 concurrent channels)

## 📚 Additional Resources

- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Index Strategies](https://www.postgresql.org/docs/current/indexes.html)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)

## 🔄 Maintenance

### Weekly Tasks

```sql
-- Update table statistics
CALL analyze_performance_tables();

-- Refresh materialized views
CALL refresh_daily_metrics();
```

### Monthly Tasks

```sql
-- Check for bloat
VACUUM ANALYZE;

-- Review slow queries
SELECT * FROM get_slow_queries(10, 100);
```
