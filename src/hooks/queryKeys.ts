/**
 * Centralized query key registry for TanStack Query.
 *
 * All query keys are organized by domain namespace with a consistent hierarchy:
 *   all()    → ['domain']
 *   lists()  → ['domain', 'list']
 *   detail() → ['domain', 'list', id]   ← lists() is a strict prefix of detail()
 *
 * This hierarchy enables cascade invalidation:
 *   invalidating all() invalidates both lists() and detail()
 *   invalidating lists() invalidates all list queries and all detail queries
 *
 * @module queryKeys
 */

export const QueryKeys = {
  // ─── Patients ────────────────────────────────────────────────────────────
  patients: {
    all: () => ["patients"] as const,
    lists: () => ["patients", "list"] as const,
    detail: (id: string) => ["patients", "list", id] as const,
    evolutions: (patientId: string) => ["patients", "list", patientId, "evolutions"] as const,
    evaluations: (patientId: string) => ["patients", "list", patientId, "evaluations"] as const,
    appointments: (patientId: string) =>
      ["patients", "list", patientId, "appointments"] as const,
    gamification: (patientId: string) =>
      ["patients", "list", patientId, "gamification"] as const,
  },

  // ─── Appointments ─────────────────────────────────────────────────────────
  appointments: {
    all: () => ["appointments"] as const,
    lists: () => ["appointments", "list"] as const,
    byDate: (date: string) => ["appointments", "list", date] as const,
    detail: (id: string) => ["appointments", "list", id] as const,
    schedule: (start: string, end: string) => ["appointments", "list", start, end] as const,
  },

  // ─── Financial ────────────────────────────────────────────────────────────
  financial: {
    all: () => ["financial"] as const,
    lists: () => ["financial", "list"] as const,
    detail: (id: string) => ["financial", "list", id] as const,
    transactions: (period?: string) => ["financial", "list", "transactions", period] as const,
    revenue: (period?: string) => ["financial", "list", "revenue", period] as const,
    expenses: (period?: string) => ["financial", "list", "expenses", period] as const,
    receipts: () => ["financial", "list", "receipts"] as const,
    nfse: () => ["financial", "list", "nfse"] as const,
  },

  // ─── Exercises ────────────────────────────────────────────────────────────
  exercises: {
    all: () => ["exercises"] as const,
    lists: () => ["exercises", "list"] as const,
    detail: (id: string) => ["exercises", "list", id] as const,
    categories: () => ["exercises", "list", "categories"] as const,
    protocols: () => ["exercises", "list", "protocols"] as const,
    protocol: (id: string) => ["exercises", "list", "protocols", id] as const,
  },

  // ─── SOAP / Evolution ─────────────────────────────────────────────────────
  soap: {
    all: () => ["soap"] as const,
    lists: () => ["soap", "list"] as const,
    detail: (id: string) => ["soap", "list", id] as const,
    byPatient: (patientId: string) => ["soap", "list", patientId] as const,
  },

  // ─── Organizations ────────────────────────────────────────────────────────
  organizations: {
    all: () => ["organizations"] as const,
    lists: () => ["organizations", "list"] as const,
    detail: (id: string) => ["organizations", "list", id] as const,
  },

  // ─── Users / Auth ─────────────────────────────────────────────────────────
  users: {
    all: () => ["users"] as const,
    lists: () => ["users", "list"] as const,
    detail: (id: string) => ["users", "list", id] as const,
    session: () => ["users", "session"] as const,
    profile: (userId: string) => ["users", "list", userId, "profile"] as const,
  },

  // ─── CRM / Leads ──────────────────────────────────────────────────────────
  leads: {
    all: () => ["leads"] as const,
    lists: () => ["leads", "list"] as const,
    detail: (id: string) => ["leads", "list", id] as const,
    historico: (leadId: string) => ["leads", "list", leadId, "historico"] as const,
    metrics: () => ["leads", "list", "metrics"] as const,
  },

  // ─── Services (Serviços) ──────────────────────────────────────────────────
  services: {
    all: () => ["services"] as const,
    lists: () => ["services", "list"] as const,
    detail: (id: string) => ["services", "list", id] as const,
  },

  // ─── Convenios ────────────────────────────────────────────────────────────
  convenios: {
    all: () => ["convenios"] as const,
    lists: () => ["convenios", "list"] as const,
    detail: (id: string) => ["convenios", "list", id] as const,
  },

  // ─── Evaluation Forms ─────────────────────────────────────────────────────
  evaluationForms: {
    all: () => ["evaluation-forms"] as const,
    lists: (tipo?: string) => ["evaluation-forms", "list", tipo] as const,
    detail: (id: string) => ["evaluation-forms", "list", id] as const,
    fields: (formId: string) => ["evaluation-forms", "list", formId, "fields"] as const,
  },

  // ─── Gamification ─────────────────────────────────────────────────────────
  gamification: {
    all: () => ["gamification"] as const,
    lists: () => ["gamification", "list"] as const,
    detail: (id: string) => ["gamification", "list", id] as const,
    config: () => ["gamification", "list", "config"] as const,
    history: (patientId: string) => ["gamification", "list", patientId, "history"] as const,
  },

  // ─── Dashboard ────────────────────────────────────────────────────────────
  dashboard: {
    all: () => ["dashboard"] as const,
    lists: () => ["dashboard", "list"] as const,
    detail: (id: string) => ["dashboard", "list", id] as const,
    stats: () => ["dashboard", "list", "stats"] as const,
    revenue: () => ["dashboard", "list", "revenue"] as const,
  },

  // ─── Settings ─────────────────────────────────────────────────────────────
  settings: {
    all: () => ["settings"] as const,
    lists: () => ["settings", "list"] as const,
    detail: (id: string) => ["settings", "list", id] as const,
    schedule: () => ["settings", "list", "schedule"] as const,
  },

  // ─── Tasks ────────────────────────────────────────────────────────────────
  tasks: {
    all: () => ["tasks"] as const,
    lists: () => ["tasks", "list"] as const,
    detail: (id: string) => ["tasks", "list", id] as const,
    analytics: () => ["tasks", "list", "analytics"] as const,
  },

  // ─── Events ───────────────────────────────────────────────────────────────
  events: {
    all: () => ["events"] as const,
    lists: () => ["events", "list"] as const,
    detail: (id: string) => ["events", "list", id] as const,
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  reports: {
    all: () => ["reports"] as const,
    lists: () => ["reports", "list"] as const,
    detail: (id: string) => ["reports", "list", id] as const,
    convenio: () => ["reports", "list", "convenio"] as const,
    medico: () => ["reports", "list", "medico"] as const,
  },
} as const;

/**
 * Type representing a domain namespace in the QueryKeys registry.
 * Each domain must have `all()`, `lists()`, and `detail(id)` factory functions.
 */
export type QueryKeyDomain = {
  all: () => readonly string[];
  lists: (...args: unknown[]) => readonly (string | undefined)[];
  detail: (id: string) => readonly string[];
};

/**
 * Helper for creating query keys with a consistent structure.
 * @deprecated Use QueryKeys directly instead.
 */
export function createQueryKeys<T extends Record<string, (...args: unknown[]) => unknown[]>>(
  keys: T,
): T {
  return keys;
}
