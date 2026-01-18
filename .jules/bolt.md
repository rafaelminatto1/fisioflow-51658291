## 2024-05-22 - [Duplicate Hooks]
**Learning:** Found multiple implementations of `useDebounce` (simple vs performance-optimized) and even local definitions within components. Consolidating these into a single robust implementation in `hooks/performance` reduces bundle size and ensures consistent behavior (like proper cleanup) across the app.
**Action:** Always check `src/hooks/performance` before implementing or importing standard hooks. Prefer the performance-optimized versions.

## 2024-05-23 - [Supabase Payload Optimization]
**Learning:** `select('*')` in Supabase queries often fetches unnecessary large text fields (like clinical notes in `soap_records`), significantly increasing payload size. Explicitly selecting only required columns reduces network transfer and parsing time.
**Action:** Always audit Supabase queries to replace `select('*')` with specific column lists, especially for tables with large content fields.
