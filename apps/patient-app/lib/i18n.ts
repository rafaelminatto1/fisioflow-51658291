/**
 * i18n (Internationalization) Utilities
 * Translation and localization support
 */


/**
 * Supported languages
 */

import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { AppStorage } from './storage';
import { log } from './logger';

export const SUPPORTED_LANGUAGES = {
  'pt-BR': { name: 'Português (Brasil)', flag: '🇧🇷' },
  'en-US': { name: 'English (US)', flag: '🇺🇸' },
  'es': { name: 'Español', flag: '🇪🇸' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Translation keys and strings
 */
const translations = {
  'pt-BR': {
    // Common
    common: {
      ok: 'OK',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Salvar',
      delete: 'Excluir',
      edit: 'Editar',
      close: 'Fechar',
      back: 'Voltar',
      next: 'Próximo',
      previous: 'Anterior',
      done: 'Concluído',
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
      retry: 'Tentar Novamente',
    },
    // Auth
    auth: {
      login: 'Entrar',
      logout: 'Sair',
      signUp: 'Criar Conta',
      forgotPassword: 'Esqueci minha senha',
      email: 'Email',
      password: 'Senha',
      confirmPassword: 'Confirmar Senha',
      fullName: 'Nome Completo',
      phone: 'Telefone',
      loginError: 'Email ou senha incorretos',
      signUpError: 'Erro ao criar conta',
      passwordResetSent: 'Email de recuperação enviado',
      linkProfessional: 'Vincular Profissional',
      inviteCode: 'Código do Convite',
    },
    // Exercises
    exercises: {
      title: 'Exercícios',
      today: 'Exercícios de Hoje',
      completed: 'Concluído',
      remaining: 'Restantes',
      progress: 'Progresso',
      viewVideo: 'Ver vídeo',
      difficulty: 'Dificuldade',
      painLevel: 'Nível de Dor',
      feedback: 'Feedback',
      allCompleted: 'Parabéns! Todos os exercícios foram concluídos!',
    },
    // Appointments
    appointments: {
      title: 'Consultas',
      upcoming: 'Próximas',
      past: 'Anteriores',
      today: 'Hoje',
      tomorrow: 'Amanhã',
      scheduled: 'Agendado',
      confirmed: 'Confirmado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    },
    // Progress
    progress: {
      title: 'Progresso',
      history: 'Histórico',
      painLevel: 'Nível de Dor',
      sessions: 'Sessões',
      improvement: 'Melhora',
      days: 'Dias',
      last7Days: 'Últimos 7 dias',
      last30Days: 'Últimos 30 dias',
      allTime: 'Todo o período',
    },
    // Settings
    settings: {
      title: 'Configurações',
      notifications: 'Notificações',
      exerciseReminders: 'Lembretes de Exercícios',
      appointmentReminders: 'Lembretes de Consultas',
      autoPlayVideos: 'Reprodução Automática',
      hapticFeedback: 'Feedback Háptico',
      clearCache: 'Limpar Cache',
      exportData: 'Exportar Dados',
      help: 'Ajuda',
      privacy: 'Privacidade',
      terms: 'Termos de Uso',
      version: 'Versão',
    },
    // Dashboard
    dashboard: {
      goodMorning: 'Bom dia',
      goodAfternoon: 'Boa tarde',
      goodEvening: 'Boa noite',
      exercisesToday: 'Exercícios de Hoje',
      nextAppointment: 'Próxima Consulta',
      streak: 'Sequência',
      noAppointments: 'Nenhuma consulta agendada',
    },
    // Errors
    errors: {
      networkError: 'Erro de conexão. Verifique sua internet.',
      genericError: 'Ocorreu um erro. Tente novamente.',
      unauthorized: 'Não autorizado.',
      notFound: 'Não encontrado.',
    },
  },
  'en-US': {
    common: {
      ok: 'OK',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      done: 'Done',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      retry: 'Retry',
    },
    auth: {
      login: 'Sign In',
      logout: 'Sign Out',
      signUp: 'Sign Up',
      forgotPassword: 'Forgot Password',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      fullName: 'Full Name',
      phone: 'Phone',
      loginError: 'Invalid email or password',
      signUpError: 'Error creating account',
      passwordResetSent: 'Password reset email sent',
      linkProfessional: 'Link Professional',
      inviteCode: 'Invite Code',
    },
    exercises: {
      title: 'Exercises',
      today: 'Today\'s Exercises',
      completed: 'Completed',
      remaining: 'Remaining',
      progress: 'Progress',
      viewVideo: 'View Video',
      difficulty: 'Difficulty',
      painLevel: 'Pain Level',
      feedback: 'Feedback',
      allCompleted: 'Great job! All exercises completed!',
    },
    appointments: {
      title: 'Appointments',
      upcoming: 'Upcoming',
      past: 'Past',
      today: 'Today',
      tomorrow: 'Tomorrow',
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    progress: {
      title: 'Progress',
      history: 'History',
      painLevel: 'Pain Level',
      sessions: 'Sessions',
      improvement: 'Improvement',
      days: 'Days',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      allTime: 'All Time',
    },
    settings: {
      title: 'Settings',
      notifications: 'Notifications',
      exerciseReminders: 'Exercise Reminders',
      appointmentReminders: 'Appointment Reminders',
      autoPlayVideos: 'Auto-play Videos',
      hapticFeedback: 'Haptic Feedback',
      clearCache: 'Clear Cache',
      exportData: 'Export Data',
      help: 'Help',
      privacy: 'Privacy',
      terms: 'Terms of Use',
      version: 'Version',
    },
    dashboard: {
      goodMorning: 'Good morning',
      goodAfternoon: 'Good afternoon',
      goodEvening: 'Good evening',
      exercisesToday: 'Today\'s Exercises',
      nextAppointment: 'Next Appointment',
      streak: 'Streak',
      noAppointments: 'No upcoming appointments',
    },
    errors: {
      networkError: 'Connection error. Check your internet.',
      genericError: 'An error occurred. Please try again.',
      unauthorized: 'Unauthorized.',
      notFound: 'Not found.',
    },
  },
  'es': {
    common: {
      ok: 'OK',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      back: 'Atrás',
      next: 'Siguiente',
      previous: 'Anterior',
      done: 'Hecho',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      retry: 'Intentar de nuevo',
    },
    auth: {
      login: 'Iniciar Sesión',
      logout: 'Cerrar Sesión',
      signUp: 'Crear Cuenta',
      forgotPassword: 'Olvidé mi contraseña',
      email: 'Correo',
      password: 'Contraseña',
      confirmPassword: 'Confirmar Contraseña',
      fullName: 'Nombre Completo',
      phone: 'Teléfono',
      loginError: 'Correo o contraseña incorrectos',
      signUpError: 'Error al crear cuenta',
      passwordResetSent: 'Correo de recuperación enviado',
      linkProfessional: 'Vincular Profesional',
      inviteCode: 'Código de Invitación',
    },
    exercises: {
      title: 'Ejercicios',
      today: 'Ejercicios de Hoy',
      completed: 'Completado',
      remaining: 'Restantes',
      progress: 'Progreso',
      viewVideo: 'Ver Video',
      difficulty: 'Dificultad',
      painLevel: 'Nivel de Dolor',
      feedback: 'Retroalimentación',
      allCompleted: '¡Buen trabajo! Todos los ejercicios completados',
    },
    appointments: {
      title: 'Citas',
      upcoming: 'Próximas',
      past: 'Pasadas',
      today: 'Hoy',
      tomorrow: 'Mañana',
      scheduled: 'Programada',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
    },
    progress: {
      title: 'Progreso',
      history: 'Historial',
      painLevel: 'Nivel de Dolor',
      sessions: 'Sesiones',
      improvement: 'Mejora',
      days: 'Días',
      last7Days: 'Últimos 7 días',
      last30Days: 'Últimos 30 días',
      allTime: 'Todo el período',
    },
    settings: {
      title: 'Configuración',
      notifications: 'Notificaciones',
      exerciseReminders: 'Recordatorios de Ejercicios',
      appointmentReminders: 'Recordatorios de Citas',
      autoPlayVideos: 'Reproducción Automática',
      hapticFeedback: 'Retroalimentación Háptica',
      clearCache: 'Limpiar Caché',
      exportData: 'Exportar Datos',
      help: 'Ayuda',
      privacy: 'Privacidad',
      terms: 'Términos de Uso',
      version: 'Versión',
    },
    dashboard: {
      goodMorning: 'Buenos días',
      goodAfternoon: 'Buenas tardes',
      goodEvening: 'Buenas noches',
      exercisesToday: 'Ejercicios de Hoy',
      nextAppointment: 'Próxima Cita',
      streak: 'Racha',
      noAppointments: 'No hay citas programadas',
    },
    errors: {
      networkError: 'Error de conexión. Verifique su internet.',
      genericError: 'Ocurrió un error. Intente nuevamente.',
      unauthorized: 'No autorizado.',
      notFound: 'No encontrado.',
    },
  },
};

/**
 * i18n instance
 */
class I18nManager {
  private i18n: I18n;
  private currentLanguage: SupportedLanguage = 'pt-BR';

  constructor() {
    this.i18n = new I18n(translations);
    this.i18n.enableFallback = true;
    this.i18n.defaultLocale = 'pt-BR';
  }

  /**
   * Initialize i18n with saved language or device locale
   */
  async init(): Promise<void> {
    try {
      // Try to get saved language
      const savedLang = await AppStorage.get<SupportedLanguage>('@fisioflow_language');

      if (savedLang && translations[savedLang]) {
        this.currentLanguage = savedLang;
      } else {
        // Detect device locale
        const deviceLocale = getLocales()[0]?.languageCode || 'pt';

        if (deviceLocale === 'pt' || deviceLocale === 'pt-BR') {
          this.currentLanguage = 'pt-BR';
        } else if (deviceLocale === 'en') {
          this.currentLanguage = 'en-US';
        } else if (deviceLocale === 'es') {
          this.currentLanguage = 'es';
        }
      }

      this.i18n.locale = this.currentLanguage;
      log.info('I18N', 'Initialized', { language: this.currentLanguage });
    } catch (error) {
      log.error('I18N', 'Failed to initialize', error);
    }
  }

  /**
   * Get current language
   */
  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set language
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (!translations[language]) {
      log.warn('I18N', 'Language not supported', { language });
      return;
    }

    this.currentLanguage = language;
    this.i18n.locale = language;

    // Save to storage
    await AppStorage.set('@fisioflow_language', language);

    log.info('I18N', 'Language changed', { language });
  }

  /**
   * Translate a key
   */
  t(key: string, options?: Record<string, string | number>): string {
    return this.i18n.t(key, options);
  }

  /**
   * Check if RTL language
   */
  isRTL(): boolean {
    return ['ar', 'he', 'fa', 'ur'].includes(this.currentLanguage);
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): typeof SUPPORTED_LANGUAGES {
    return SUPPORTED_LANGUAGES;
  }
}

// Singleton instance
export const i18n = new I18nManager();

// Convenience function
export function t(key: string, options?: Record<string, string | number>): string {
  return i18n.t(key, options);
}

export default i18n;
