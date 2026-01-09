# System Diagnostics Guide

This document describes how to use the new performance monitoring tools.

## Database Performance Functions

Three new functions are available in the `public` schema:

### 1. `get_table_sizes()`
Returns size statistics for all tables.
```sql
SELECT * FROM get_table_sizes();
```
**Columns:** `table_name`, `row_count`, `total_size`, `index_size`, `toast_size`

### 2. `get_cache_hit_ratio()`
Returns the buffer cache hit ratio (should be >99% for good performance).
```sql
SELECT * FROM get_cache_hit_ratio();
```

### 3. `get_unused_indexes()`
Identifies indexes with less than 50 scans (candidates for removal).
```sql
SELECT * FROM get_unused_indexes();
```

## Vercel Monitoring

**Analytics** and **Speed Insights** are now integrated.

- Access via: [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Analytics / Speed Insights tabs.
- Data collection starts automatically after deployment.

## Edge Function Improvements

- **`schedule-reminders`**: Now uses batched parallel execution (5 at a time) for faster WhatsApp delivery.
- **`webhook-stripe`**: Already includes signature verification for security.

## Recommended Cron Jobs

Consider scheduling these via Supabase Cron (Dashboard → Database → Extensions → pg_cron):

| Job | Schedule | Command |
|-----|----------|---------|
| Clean notifications | `0 2 * * *` | `SELECT cleanup_old_notification_data();` |
| Clean audit logs (30d+) | `0 3 * * 0` | Custom function to delete old audit entries |

---
*Last updated: 2026-01-09*
