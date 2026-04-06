# FisioFlow - Codebase Analysis & Maintenance Report

## 1. Architectural Transition & Technical Debt
- **Transition Status:** The project is migrating from Firebase to Neon DB (PostgreSQL) + Drizzle ORM + Cloudflare Workers (v4.0.0 architecture).
- **API Consolidation:** The legacy API (`cloudflare-worker/fisioflow-api.ts`) is disabled in fail-closed mode and should not be used. The canonical API is `apps/api/src/index.ts`.
- **Duplicate Data Hooks:** Hooks like `usePatientsV2.ts` existed as partial migration attempts but were largely unused. I have deleted `usePatientsV2.ts` to reduce confusion. The application is standardizing around `usePatientCrud.ts` and `usePatients.ts` for patient management, which already query the new Workers API (`patientsApi`).

## 2. Dead Code Elimination
During the analysis, significant dead code was identified and removed to streamline maintenance:
- **`src/components/patients/PatientDashboard360.tsx`**: A duplicate, unused version of the dashboard was sitting in the plural `patients/` folder. The active component is correctly located in `src/components/patient/dashboard/`. (Deleted).
- **`src/components/performance/utils.tsx`**: An empty/unused utility file holding space. The actual performance hooks reside in `src/hooks/performance/`. (Deleted).
- **`src/hooks/usePatientsV2.ts`**: An unused V2 iteration of the patients hook that duplicated logic from `usePatientCrud.ts` and `usePatients.ts`. (Deleted).

## 3. Performance Bottlenecks & Optimization Strategies
- **Data Hook Complexity:** Files like `useSoapRecords.ts` and `usePatientCrud.ts` are extremely large (17k+ bytes). To improve maintainability, these should be broken down into smaller, specialized hooks (e.g., separating Queries from Mutations).
- **Caching Strategy:** The file `src/hooks/useReactQueryOptimization.ts` contains a robust caching strategy (`CACHE_CONFIG`), but it defines generic wrappers like `useOptimizedQuery` that abstract TanStack Query too much. In standard practice, it's better to use `useQuery` directly and pass `staleTime`/`gcTime` constants.
- **Prefetching Errors:** The codebase had memory notes indicating that prefetching patient stats caused 404s because the `/api/patients/:id/stats` endpoint doesn't exist on the workers API. This highlights the need to ensure frontend queries perfectly match the available Hono routes.

## 4. Missing PRD Features (Gap Analysis)
Based on `prd.md`, the following areas are flagged as "Parcial" or "Planejado" and require future development:
- **Financial Module (Gestão Financeira Avançada):** Needs implementation of session packages, automatic debit, and Stripe/PIX integration.
- **Telemedicine:** Basic flow exists, but WebRTC, recording, and waiting room features are missing.
- **Gamification:** Patient dashboard, achievements, and leaderboards are partially implemented.
- **CRM / Communication:** Official WhatsApp Business API integration for reminders and confirmations is a major pending milestone.
- **Native Mobile Apps:** Expo/React Native apps are planned/in progress (`apps/professional-app`, `apps/patient-app`).

## 5. Next Steps for Maintenance
1. **Refactor `usePatientCrud.ts`**: This file handles too many responsibilities (List, Create, Update, Delete, Paginate, Update Status). Split it into modular hooks.
2. **Review `src/components/patients/`**: Evaluate if other files in this plural folder can be merged into `src/components/patient/` to maintain a single source of truth for patient-related UI components.
3. **Strict API Alignment**: Ensure all React Query fetchers correctly point to `apps/api/` routes and not legacy Firebase endpoints.
