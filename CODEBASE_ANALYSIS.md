# FisioFlow Codebase Analysis Report

## Executive Summary
This report provides a high-level overview of the `fisioflow-monorepo` project architecture, technical debt, and performance insights, based on a comprehensive analysis of the existing codebase.

## 1. Monorepo Architecture & Structure
The project is structured as a `pnpm` monorepo utilizing workspaces.
- **Root Configurations:** Valid `pnpm-workspace.yaml` explicitly defining `apps/*`, `packages/*`, and `functions`.
- **Applications (`apps/`):**
  - `web` (React/Vite SPA): Main professional application. Employs advanced configuration such as Rolldown `codeSplitting` optimization groups (`vendor-vtk`, `vendor-cornerstone-core`, etc.) directly inside `vite.config.ts`.
  - `professional-app` (Expo/React Native): Mobile app for professionals.
  - `patient-app` (Expo/React Native): Mobile app for patients.
  - `api` (Hono on Cloudflare Workers): Backend API connecting with Neon Database (PostgreSQL).
  - `mobile-ios` / `vinext-poc` / `jules-bot`: Likely experimental/historical applications.
- **Packages (`packages/`):**
  - Shared dependencies like `config`, `core`, `db` (Drizzle ORM definitions), `ui`, `shared-api`.

**Recommendation:** Consider standardizing the build steps and standardizing on tools across the monorepo. (e.g. `web` uses Vite/Vitest while mobile apps use Metro/Jest).

## 2. Technical Debt & Dead Code
- **Duplicate Logic (Performance Hooks):** Both `src/hooks/useDebounce.ts` and `src/hooks/performance/useDebounce.ts` exist. The memory context indicates `src/hooks/performance/useDebounce.ts` is the canonical implementation. The duplicate at `src/hooks/useDebounce.ts` should be safely removed to prevent confusion.
- **Missing Legacy Files:** Memory context referenced `vite.config.performance.ts` and `src/components/performance/utils.tsx` as unused/dead code, but they have already been deleted from the project.
- **PatientDashboard360:** The memory context referred to duplicates of `PatientDashboard360.tsx`. Currently, only `src/components/patient/dashboard/PatientDashboard360.tsx` exists, meaning the duplicate `patients` folder version was already cleaned up.

**Immediate Actions (Low-Hanging Fruit):**
- Remove `src/hooks/useDebounce.ts` and update imports to use `src/hooks/performance/useDebounce.ts`.

## 3. Performance Insights
- **Bundle Optimization:** The `apps/web/vite.config.ts` has a very comprehensive chunking strategy via `rolldownOptions.output.codeSplitting`. This is highly tuned for heavily separated chunks like `@cornerstonejs`, `react-pdf`, `@tensorflow`, and `exceljs`.
- **React Core Warning:** `react` and `react-dom` are explicitly pinned to a priority of `100` to avoid circular dependency issues when code-splitting. This is a very good practice for Rolldown.
- **Patient Stats Fetching:** The `usePatients.ts` hook is known to have a performance bottleneck involving cascading calls to `patientsApi.getStats`. Future optimization cycles should focus on batching these requests or introducing a `usePatientsSummary` hook.

## Roadmap for Improvement
1. **Consolidate Performance Hooks:** Remove duplicate `useDebounce` and verify imports.
2. **Linting Triage:** With >1000 warnings across the project, implement a strategy of "zero new warnings" while progressively refactoring legacy code.
3. **Vitest E2E Standardization:** Given JSDOM flakiness for component testing, migrate component-heavy DOM interaction tests completely to the existing Playwright E2E suite (`apps/web/playwright.config.ts`).
4. **API Integration:** Ensure that Supabase API functions correctly migrate to the newly created Cloudflare Workers `api` application, reducing the reliance on older Firebase/Supabase Functions over time.
