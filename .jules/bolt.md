## 2024-05-22 - [Duplicate Hooks]
**Learning:** Found multiple implementations of `useDebounce` (simple vs performance-optimized) and even local definitions within components. Consolidating these into a single robust implementation in `hooks/performance` reduces bundle size and ensures consistent behavior (like proper cleanup) across the app.
**Action:** Always check `src/hooks/performance` before implementing or importing standard hooks. Prefer the performance-optimized versions.

## 2024-05-23 - [Supabase Payload Optimization]
**Learning:** `select('*')` in Supabase queries often fetches unnecessary large text fields (like clinical notes in `soap_records`), significantly increasing payload size. Explicitly selecting only required columns reduces network transfer and parsing time.
**Action:** Always audit Supabase queries to replace `select('*')` with specific column lists, especially for tables with large content fields.

## 2024-05-23 - [Test Environment & Build Memory]
**Learning:** The local Vitest environment is unstable for component tests (JSDOM issues), making unit testing difficult. Additionally, the build process runs out of memory on standard settings.
**Action:** Use `pnpm build:prod` (which increases memory) for builds, and rely on Playwright for reliable frontend verification when unit tests fail due to environment issues.

## 2026-03-XX - [Ghost Components & Summary Hooks]
**Learning:** Found a component (`src/components/patients/PatientDashboard360.tsx`) that appeared to be a duplicate/dead code version of another active component. Also, implementing a `useSoapRecordsSummary` hook allowed optimizing list views without breaking components that need full details.
**Action:** When optimizing, check for duplicate component names in different folders. Create explicit `Summary` interfaces and hooks for large entities to enforce lean data fetching in dashboards.
