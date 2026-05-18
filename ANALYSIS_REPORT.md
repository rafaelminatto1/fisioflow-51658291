# Fisioflow Performance & Cost Optimization Report

This report outlines critical, medium, and low priority issues found during the deep scan of the `apps/api` (backend/Hono) and `apps/web` (frontend/React/Vite) codebases. The focus of the analysis was the core high-traffic data flows: Patients List, Agenda (Schedule), and the Exercise Library.

## 🔴 High/Critical Priority

### 1. Backend: Missing Limits & Pagination on High-Volume Endpoints

**Description:**
The backend routes that power the primary dashboard flows fetch an unbounded (or excessively bounded) amount of data, severely impacting both Cloudflare Worker memory/execution time and Neon DB usage.

- **Appointments (Agenda):** In `apps/api/src/routes/appointments.ts`, the default `GET /` route lacks server-side pagination. While it enforces a maximum limit via `Math.min(1000, Math.max(1, parseInt(limit) || 100))`, a limit of 1000 joined appointment + patient rows per request is extremely high for daily usage, especially considering this endpoint is polled.
- **Patients:** The `apps/api/src/routes/patients.ts` endpoint attempts to aggregate massive amounts of sub-data per patient (e.g., total appointments, no-shows, upcoming schedules, financial status) using complex Common Table Expressions (CTEs). Even with `limit: 100`, this query computes over _all_ historical data before paginating, leading to very high database CPU load on large tenants.

**Suggestions:**

- **Implement Cursor-Based or Strict Offset Pagination:** Update frontend hooks (like `usePatientsPage`) to only request 20-50 rows at a time.
- **Optimize CTEs:** In `patients.ts`, do not compute `total_appointments` and `completed_appointments` dynamically on every fetch. Instead, maintain these counters asynchronously via a trigger, queue, or Inngest worker in a separate `patient_stats` table to ensure `O(1)` fetch times.

### 2. Frontend: Unpaginated React Query Data Fetching

**Description:**
The frontend heavily relies on `@tanstack/react-query`, but some hooks explicitly request massive data payloads to avoid implementing client-side pagination components.

- **Exercises:** In `apps/web/src/hooks/useExercises.ts`, the `workersFilters` object hardcodes `limit: 500`. This forces the backend to fetch and the frontend to hold 500 exercise records in memory simultaneously, significantly slowing down DOM rendering in `ExerciseLibrary.tsx`.
- **Schedule Page:** In `apps/web/src/hooks/useSchedulePage.ts`, the `appointmentsApi.list({ limit: 500 })` call is hardcoded. While calendar views need a month's worth of data, 500 might not be enough for large clinics, or might be too heavy.

**Suggestions:**

- **Infinite Scrolling / Paginated Queries:** Update `useExercises.ts` to utilize React Query's `useInfiniteQuery` alongside an IntersectionObserver on the frontend to load exercises dynamically as the user scrolls.
- **Calendar Boundaries:** Ensure `useSchedulePage.ts` dynamically calculates the exact start and end dates of the _currently visible_ calendar view and fetches only those bounds.

## 🟡 Medium Priority

### 1. Database: `SELECT *` Equivalent and Inefficient Joins

**Description:**
Several Drizzle ORM queries fetch entire rows when only a fraction of the fields are required.

- **Appointments:** `appointments.ts` manually selects most columns, but it also joins the entire `patients` table just to grab `fullName` and `phone`.
- **Exercises:** In `apps/api/src/routes/exercises.ts`, the list query returns large text fields like `description`, `indicated_pathologies`, and `contraindicated_pathologies` for _every_ exercise in the library list view. These fields are typically only needed when a user clicks to view the specific exercise details.

**Suggestions:**

- **Projection Optimization:** Remove heavy text and JSONB fields from the base list queries. Create a separate endpoint or utilize the existing `GET /:id` to fetch detailed data only on demand.

### 2. Frontend: Aggressive Data Refetching

**Description:**
In `useSchedulePage.ts`, the query `schedule-appointments` has `staleTime: 0`.

**Suggestions:**

- Given that the application uses `broadcastToOrg` and `sendPushToOrg` for real-time updates (as seen in the backend code), the frontend should rely on WebSocket/Push invalidation to trigger refetches instead of eagerly refetching or having `staleTime: 0`. Increase `staleTime` to at least `30000` (30 seconds) to prevent redundant queries when navigating between views.

## 🟢 Low Priority

### 1. Backend: KV Cache Invalidation Strategy

**Description:**
In `exercises.ts`, the system attempts to cache the first 5 pages of the exercise library (`KV_LIST_PREFIXp{1-5}`). However, when the library is updated, `invalidateListCache` only blindly deletes those exact 5 keys. If a user sets a custom limit (e.g., 25), that cache is never hit nor correctly managed.

**Suggestions:**

- **Simpler Caching:** Use Cloudflare CDN caching via `Cache-Control` headers for public/tenant-agnostic resources like the exercise library, rather than manually managing KV store keys for specific pagination boundaries.

### 2. General Code Duplication

**Description:**
The backend has scattered references to date math (e.g., `calculateEndTime` in appointments). The frontend repeats custom date parsers across `useSchedulePage.ts` and `Schedule.tsx`.

**Suggestions:**

- Standardize all date manipulations across the monorepo using a single shared utility package (potentially using `date-fns-tz` which is already in the `package.json`) to prevent hard-to-debug timezone issues.
