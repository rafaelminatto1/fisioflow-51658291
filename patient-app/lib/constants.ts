/**
 * App Constants
 * Common values used throughout the app
 */

/**
 * App metadata
 */
export const APP_NAME = 'FisioFlow';
export const APP_VERSION = '1.0.0';
export const EAS_PROJECT_ID = '8e006901-c021-464d-bbcd-96d821ab62d0';

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: '@fisioflow_onboarding_completed',
  NOTIFICATION_PROMPT_SHOWN: '@fisioflow_notification_prompt_shown',
  SETTINGS_NOTIFICATIONS: '@fisioflow_settings_notifications',
  SETTINGS_EXERCISE_REMINDERS: '@fisioflow_settings_exercise_reminders',
  SETTINGS_APPOINTMENT_REMINDERS: '@fisioflow_settings_appointment_reminders',
  SETTINGS_AUTO_PLAY_VIDEOS: '@fisioflow_settings_auto_play_videos',
  SETTINGS_HAPTIC_FEEDBACK: '@fisioflow_settings_haptic_feedback',
  OFFLINE_QUEUE: '@fisioflow_offline_queue',
  CACHED_DATA_PREFIX: '@fisioflow_cache_',
} as const;

/**
 * Animation durations (in ms)
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 750,
} as const;

/**
 * Layout dimensions
 */
export const LAYOUT = {
  SCREEN_PADDING: 16,
  CARD_PADDING: 16,
  BORDER_RADIUS: {
    SMALL: 8,
    MEDIUM: 12,
    LARGE: 16,
    XLARGE: 20,
    ROUND: 999,
  },
  ICON_SIZE: {
    SMALL: 16,
    MEDIUM: 20,
    LARGE: 24,
    XLARGE: 32,
  },
} as const;

/**
 * Text sizes
 */
export const TEXT_SIZE = {
  XXS: 10,
  XS: 11,
  S: 12,
  M: 14,
  L: 16,
  XL: 18,
  XXL: 20,
  XXXL: 24,
  DISPLAY: 28,
} as const;

/**
* Font weights
*/
export const FONT_WEIGHT = {
  REGULAR: '400' as const,
  MEDIUM: '500' as const,
  SEMIBOLD: '600' as const,
  BOLD: '700' as const,
} as const;

/**
 * Spacing
 */
export const SPACING = {
  XXS: 4,
  XS: 8,
  S: 12,
  M: 16,
  L: 20,
  XL: 24,
  XXL: 32,
  XXXL: 48,
} as const;

/**
 * Breakpoints (for responsive design)
 */
export const BREAKPOINTS = {
  SMALL: 375, // iPhone SE
  MEDIUM: 390, // iPhone 14
  LARGE: 428, // iPhone 14 Pro Max
} as const;

/**
 * Screen names (for analytics and navigation)
 */
export const SCREENS = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  LINK_PROFESSIONAL: 'LinkProfessional',
  ONBOARDING: 'Onboarding',

  // Tabs
  DASHBOARD: 'Dashboard',
  EXERCISES: 'Exercises',
  APPOINTMENTS: 'Appointments',
  PROGRESS: 'Progress',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
} as const;

/**
 * Firebase collection paths
 */
export const COLLECTIONS = {
  USERS: 'users',
  EXERCISE_PLANS: 'exercise_plans',
  APPOINTMENTS: 'appointments',
  EVOLUTIONS: 'evolutions',
  FEEDBACK: 'feedback',
} as const;

/**
 * Exercise difficulty levels
 */
export const EXERCISE_DIFFICULTY = {
  VERY_EASY: 1,
  EASY: 2,
  MEDIUM: 3,
  HARD: 4,
  VERY_HARD: 5,
} as const;

export const EXERCISE_DIFFICULTY_LABELS = {
  1: 'Muito Fácil',
  2: 'Fácil',
  3: 'Médio',
  4: 'Difícil',
  5: 'Muito Difícil',
} as const;

/**
 * Pain scale (0-10)
 */
export const PAIN_LEVEL = {
  NONE: 0,
  MILD: 3,
  MODERATE: 6,
  SEVERE: 10,
} as const;

export const PAIN_LEVEL_LABELS = {
  0: 'Sem dor',
  3: 'Dor leve',
  6: 'Dor moderada',
  10: 'Dor intensa',
} as const;

/**
 * Appointment status
 */
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const APPOINTMENT_STATUS_LABELS = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  PATIENT: 'patient',
  PROFESSIONAL: 'professional',
  ADMIN: 'admin',
} as const;

/**
 * Date formats for date-fns
 */
export const DATE_FORMATS = {
  DATE_ONLY: 'dd/MM/yyyy',
  TIME_ONLY: 'HH:mm',
  DATE_TIME: "dd/MM/yyyy 'às' HH:mm",
  FULL_DATE: "EEEE, d 'de' MMMM 'de' yyyy",
  RELATIVE: "EEEE, d 'de' MMMM",
} as const;

/**
 * Error messages (for user-facing errors)
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  GENERIC_ERROR: 'Ocorreu um erro. Tente novamente.',
  UNAUTHORIZED: 'Você não tem permissão para acessar este recurso.',
  NOT_FOUND: 'Recurso não encontrado.',
  VALIDATION_ERROR: 'Por favor, verifique os dados inseridos.',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Salvo com sucesso!',
  UPDATE_SUCCESS: 'Atualizado com sucesso!',
  DELETE_SUCCESS: 'Excluído com sucesso!',
  SYNC_SUCCESS: 'Sincronizado com sucesso!',
} as const;

/**
 * Help/Support URLs
 */
export const SUPPORT_URLS = {
  PRIVACY_POLICY: 'https://fisioflow.app/privacy',
  TERMS_OF_SERVICE: 'https://fisioflow.app/terms',
  HELP_CENTER: 'https://fisioflow.app/help',
  CONTACT_EMAIL: 'support@fisioflow.app',
} as const;

/**
 * Social media links
 */
export const SOCIAL_LINKS = {
  INSTAGRAM: 'https://instagram.com/fisioflow',
  FACEBOOK: 'https://facebook.com/fisioflow',
  LINKEDIN: 'https://linkedin.com/company/fisioflow',
} as const;
