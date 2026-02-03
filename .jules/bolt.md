## 2024-05-22 - [Duplicate Hooks]
**Learning:** Found multiple implementations of `useDebounce` (simple vs performance-optimized) and even local definitions within components. Consolidating these into a single robust implementation in `hooks/performance` reduces bundle size and ensures consistent behavior (like proper cleanup) across the app.
**Action:** Always check `src/hooks/performance` before implementing or importing standard hooks. Prefer the performance-optimized versions.

## 2024-05-23 - [Supabase Payload Optimization]
**Learning:** `select('*')` in Supabase queries often fetches unnecessary large text fields (like clinical notes in `soap_records`), significantly increasing payload size. Explicitly selecting only required columns reduces network transfer and parsing time.
**Action:** Always audit Supabase queries to replace `select('*')` with specific column lists, especially for tables with large content fields.

## 2024-05-23 - [Test Environment & Build Memory]
**Learning:** The local Vitest environment is unstable for component tests (JSDOM issues), making unit testing difficult. Additionally, the build process runs out of memory on standard settings.
**Action:** Use `pnpm build:prod` (which increases memory) for builds, and rely on Playwright for reliable frontend verification when unit tests fail due to environment issues.

## 2024-05-24 - [Prefetch Query Key Collision]
**Learning:** `usePatients` was aggressively prefetching `['patient-stats', id]` using a Cloud Function (REST API), while `usePatientStats` fetched the same key using Firestore. This caused cache collisions where components received incompatible data structures, potentially causing crashes or display errors.
**Action:** When prefetching, always ensure the fetcher function and returned data structure match exactly what the consuming hook expects. Avoid "blind" prefetching of keys managed by other hooks.
