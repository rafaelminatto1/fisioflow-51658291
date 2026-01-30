// Firebase Collections
export const COLLECTIONS = {
  USERS: 'users',
  PROFILES: 'profiles',
  USER_ROLES: 'user_roles',
  PRESENCE: 'presence',
  PATIENTS: 'patients',
  EVALUATIONS: 'evaluations',
  EVALUATION_TEMPLATES: 'evaluation_templates',
  TREATMENT_PLANS: 'treatment_plans',
  EXERCISE_PRESCRIPTIONS: 'exercise_prescriptions',
  EXERCISE_SESSIONS: 'exercise_sessions',
  EXERCISES: 'exercises',
  APPOINTMENTS: 'appointments',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  ACHIEVEMENTS: 'achievements',
  // Progress tracking collections
  EXERCISE_PROGRESS: 'exercise_progress',
  PATIENT_PROGRESS: 'patient_progress',
  DAILY_STATS: 'daily_stats',
} as const;

// Exercise Categories
export const EXERCISE_CATEGORIES = {
  LOWER_BODY: 'lower_body',
  UPPER_BODY: 'upper_body',
  CORE: 'core',
  CARDIO: 'cardio',
  FLEXIBILITY: 'flexibility',
  BALANCE: 'balance',
  POSTURE: 'posture',
} as const;

// Exercise Difficulties
export const EXERCISE_DIFFICULTIES = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

// Appointment Status
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NOSHOW: 'noshow',
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  PIX: 'pix',
  TRANSFER: 'transfer',
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  MONTH_YEAR: 'MMMM/YYYY',
} as const;

// Error Messages
export const ERRORS = {
  UNAUTHORIZED: 'Você não tem permissão para realizar esta ação',
  NOT_FOUND: 'Recurso não encontrado',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet',
  UNKNOWN: 'Ocorreu um erro. Tente novamente',
} as const;

// Colors
export const colors = {
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  secondary: '#64748B',
  secondaryForeground: '#FFFFFF',
  background: '#FFFFFF',
  foreground: '#0F172A',
  card: '#F8FAFC',
  cardForeground: '#0F172A',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  danger: '#EF4444',
  dangerForeground: '#FFFFFF',
  success: '#22C55E',
  warning: '#F59E0B',
} as const;
