/**
 * Chaves centralizadas para queries do React Query
 * Ajuda a manter consistência e evitar typos nas query keys
 */

export const QueryKeys = {
  // Auth
  session: ['session'] as const,
  user: ['user'] as const,
  profile: (userId: string) => ['profile', userId] as const,

  // Organizations
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organization', id] as const,

  // Patients
  patients: ['patients'] as const,
  patient: (id: string) => ['patient', id] as const,
  patientEvolutions: (patientId: string) => ['patient', patientId, 'evolutions'] as const,
  patientEvaluations: (patientId: string) => ['patient', patientId, 'evaluations'] as const,
  patientAppointments: (patientId: string) => ['patient', patientId, 'appointments'] as const,
  patientGamification: (patientId: string) => ['patient', patientId, 'gamification'] as const,

  // Appointments
  appointments: ['appointments'] as const,
  appointment: (id: string) => ['appointment', id] as const,
  schedule: (start: string, end: string) => ['schedule', start, end] as const,

  // Evaluation Forms
  evaluationForms: (tipo?: string) => ['evaluation-forms', tipo] as const,
  evaluationForm: (id: string) => ['evaluation-form', id] as const,
  evaluationFormFields: (formId: string) => ['evaluation-form', formId, 'fields'] as const,

  // Standard Forms
  standardForms: ['standard-forms'] as const,
  standardFormExists: (type: string) => ['standard-form-exists', type] as const,

  // Evolution / SOAP
  soapRecords: (patientId?: string) => ['soap-records', patientId] as const,
  soapRecord: (id: string) => ['soap-record', id] as const,

  // Protocols
  protocols: ['protocols'] as const,
  protocol: (id: string) => ['protocol', id] as const,
  protocolExercises: (id: string) => ['protocol', id, 'exercises'] as const,

  // Exercises
  exercises: ['exercises'] as const,
  exercise: (id: string) => ['exercise', id] as const,
  exerciseCategories: ['exercise-categories'] as const,

  // CRM
  leads: ['leads'] as const,
  lead: (id: string) => ['lead', id] as const,
  leadScore: (id: string) => ['lead', id, 'score'] as const,
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaign', id] as const,

  // Finance
  finances: (period?: string) => ['finances', period] as const,
  revenue: (period?: string) => ['revenue', period] as const,
  expenses: (period?: string) => ['expenses', period] as const,
  receipts: ['receipts'] as const,
  nfse: ['nfse'] as const,

  // Reports
  reportsConvenio: ['reports', 'convenio'] as const,
  reportsMedico: ['reports', 'medico'] as const,

  // Services
  services: ['services'] as const,
  service: (id: string) => ['service', id] as const,

  // Convenios
  convenios: ['convenios'] as const,
  convenio: (id: string) => ['convenio', id] as const,

  // Tasks
  tasks: ['tasks'] as const,
  task: (id: string) => ['task', id] as const,
  taskAnalytics: ['tasks', 'analytics'] as const,

  // Events
  events: ['events'] as const,
  event: (id: string) => ['event', id] as const,

  // Dashboard
  dashboardStats: ['dashboard', 'stats'] as const,
  dashboardAppointments: ['dashboard', 'appointments'] as const,
  dashboardRevenue: ['dashboard', 'revenue'] as const,

  // Settings
  settings: ['settings'] as const,
  scheduleSettings: ['settings', 'schedule'] as const,

  // Gamification
  gamificationConfig: ['gamification', 'config'] as const,
  gamificationHistory: (patientId: string) => ['gamification', patientId, 'history'] as const,
} as const;

/**
 * Helper para criar query keys dinâmicas
 */
export function createQueryKeys<T extends Record<string, (...args: any[]) => any[]>>(
  keys: T
): T {
  return keys;
}
