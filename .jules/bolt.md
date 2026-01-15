## 2024-05-22 - [Duplicate Hooks]
**Learning:** Found multiple implementations of `useDebounce` (simple vs performance-optimized) and even local definitions within components. Consolidating these into a single robust implementation in `hooks/performance` reduces bundle size and ensures consistent behavior (like proper cleanup) across the app.
**Action:** Always check `src/hooks/performance` before implementing or importing standard hooks. Prefer the performance-optimized versions.
