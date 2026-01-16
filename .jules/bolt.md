## 2024-05-22 - [Duplicate Hooks]
**Learning:** Found multiple implementations of `useDebounce` (simple vs performance-optimized) and even local definitions within components. Consolidating these into a single robust implementation in `hooks/performance` reduces bundle size and ensures consistent behavior (like proper cleanup) across the app.
**Action:** Always check `src/hooks/performance` before implementing or importing standard hooks. Prefer the performance-optimized versions.

## 2024-05-23 - [Test Environment & Build Memory]
**Learning:** The local Vitest environment is unstable for component tests (JSDOM issues), making unit testing difficult. Additionally, the build process runs out of memory on standard settings.
**Action:** Use `pnpm build:prod` (which increases memory) for builds, and rely on Playwright for reliable frontend verification when unit tests fail due to environment issues.
