/**
 * Sistema de internacionalização (i18n)
 * Suporte a múltiplos idiomas com formatação de datas, números e moedas
 */

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES';

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  flag: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  currencyFormat: Intl.NumberFormatOptions;
}

export const locales: Record<SupportedLocale, LocaleConfig> = {
  'pt-BR': {
    code: 'pt-BR',
    name: 'Português (Brasil)',
    flag: '🇧🇷',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    currencyFormat: {
      style: 'currency',
      currency: 'BRL',
    },
  },
  'en-US': {
    code: 'en-US',
    name: 'English (United States)',
    flag: '🇺🇸',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'hh:mm a',
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    currencyFormat: {
      style: 'currency',
      currency: 'USD',
    },
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Español (España)',
    flag: '🇪🇸',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
    currencyFormat: {
      style: 'currency',
      currency: 'EUR',
    },
  },
};

/**
 * Traduções para textos comuns na aplicação
 */
export const translations = {
  'pt-BR': {
    // Comum
    'app.name': 'FisioFlow',
    'app.loading': 'Carregando...',
    'app.error': 'Ocorreu um erro',
    'app.success': 'Sucesso',
    'app.cancel': 'Cancelar',
    'app.save': 'Salvar',
    'app.delete': 'Excluir',
    'app.edit': 'Editar',
    'app.add': 'Adicionar',
    'app.search': 'Buscar',
    'app.filter': 'Filtrar',
    'app.actions': 'Ações',
    'app.noData': 'Nenhum dado encontrado',
    'app.retry': 'Tentar novamente',

    // Auth
    'auth.signIn': 'Entrar',
    'auth.signOut': 'Sair',
    'auth.signUp': 'Cadastrar',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.forgotPassword': 'Esqueci minha senha',
    'auth.rememberMe': 'Lembrar-me',

    // Pacientes
    'patients.title': 'Pacientes',
    'patients.new': 'Novo Paciente',
    'patients.name': 'Nome Completo',
    'patients.cpf': 'CPF',
    'patients.phone': 'Telefone',
    'patients.email': 'E-mail',
    'patients.birthdate': 'Data de Nascimento',
    'patients.address': 'Endereço',

    // Agenda
    'schedule.title': 'Agenda',
    'schedule.appointment': 'Consulta',
    'schedule.newAppointment': 'Nova Consulta',
    'schedule.date': 'Data',
    'schedule.time': 'Horário',
    'schedule.duration': 'Duração',
    'schedule.status': 'Status',

    // Financeiro
    'finance.title': 'Financeiro',
    'finance.income': 'Receitas',
    'finance.expenses': 'Despesas',
    'finance.balance': 'Saldo',
    'finance.receipt': 'Recibo',

    // Relatórios
    'reports.title': 'Relatórios',
    'reports.convenio': 'Relatório Convênio',
    'reports.medico': 'Relatório Médico',

    // Erros
    'error.required': 'Este campo é obrigatório',
    'error.invalidEmail': 'E-mail inválido',
    'error.invalidCPF': 'CPF inválido',
    'error.network': 'Erro de conexão',
    'error.unauthorized': 'Não autorizado',
    'error.notFound': 'Não encontrado',
  },
  'en-US': {
    // Common
    'app.name': 'FisioFlow',
    'app.loading': 'Loading...',
    'app.error': 'An error occurred',
    'app.success': 'Success',
    'app.cancel': 'Cancel',
    'app.save': 'Save',
    'app.delete': 'Delete',
    'app.edit': 'Edit',
    'app.add': 'Add',
    'app.search': 'Search',
    'app.filter': 'Filter',
    'app.actions': 'Actions',
    'app.noData': 'No data found',
    'app.retry': 'Try again',

    // Auth
    'auth.signIn': 'Sign In',
    'auth.signOut': 'Sign Out',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password',
    'auth.rememberMe': 'Remember me',

    // Patients
    'patients.title': 'Patients',
    'patients.new': 'New Patient',
    'patients.name': 'Full Name',
    'patients.cpf': 'CPF',
    'patients.phone': 'Phone',
    'patients.email': 'E-mail',
    'patients.birthdate': 'Date of Birth',
    'patients.address': 'Address',

    // Schedule
    'schedule.title': 'Schedule',
    'schedule.appointment': 'Appointment',
    'schedule.newAppointment': 'New Appointment',
    'schedule.date': 'Date',
    'schedule.time': 'Time',
    'schedule.duration': 'Duration',
    'schedule.status': 'Status',

    // Financial
    'finance.title': 'Financial',
    'finance.income': 'Income',
    'finance.expenses': 'Expenses',
    'finance.balance': 'Balance',
    'finance.receipt': 'Receipt',

    // Reports
    'reports.title': 'Reports',
    'reports.convenio': 'Insurance Report',
    'reports.medico': 'Medical Report',

    // Errors
    'error.required': 'This field is required',
    'error.invalidEmail': 'Invalid email',
    'error.invalidCPF': 'Invalid CPF',
    'error.network': 'Connection error',
    'error.unauthorized': 'Unauthorized',
    'error.notFound': 'Not found',
  },
  'es-ES': {
    // Común
    'app.name': 'FisioFlow',
    'app.loading': 'Cargando...',
    'app.error': 'Ocurrió un error',
    'app.success': 'Éxito',
    'app.cancel': 'Cancelar',
    'app.save': 'Guardar',
    'app.delete': 'Eliminar',
    'app.edit': 'Editar',
    'app.add': 'Añadir',
    'app.search': 'Buscar',
    'app.filter': 'Filtrar',
    'app.actions': 'Acciones',
    'app.noData': 'No se encontraron datos',
    'app.retry': 'Intentar de nuevo',

    // Auth
    'auth.signIn': 'Iniciar sesión',
    'auth.signOut': 'Cerrar sesión',
    'auth.signUp': 'Registrarse',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.forgotPassword': 'Olvidé mi contraseña',
    'auth.rememberMe': 'Recordarme',

    // Pacientes
    'patients.title': 'Pacientes',
    'patients.new': 'Nuevo Paciente',
    'patients.name': 'Nombre Completo',
    'patients.cpf': 'CPF',
    'patients.phone': 'Teléfono',
    'patients.email': 'Correo electrónico',
    'patients.birthdate': 'Fecha de Nacimiento',
    'patients.address': 'Dirección',

    // Agenda
    'schedule.title': 'Agenda',
    'schedule.appointment': 'Cita',
    'schedule.newAppointment': 'Nueva Cita',
    'schedule.date': 'Fecha',
    'schedule.time': 'Hora',
    'schedule.duration': 'Duración',
    'schedule.status': 'Estado',

    // Financiero
    'finance.title': 'Financiero',
    'finance.income': 'Ingresos',
    'finance.expenses': 'Gastos',
    'finance.balance': 'Saldo',
    'finance.receipt': 'Recibo',

    // Informes
    'reports.title': 'Informes',
    'reports.convenio': 'Informe Seguro',
    'reports.medico': 'Informe Médico',

    // Errores
    'error.required': 'Este campo es obligatorio',
    'error.invalidEmail': 'Correo electrónico inválido',
    'error.invalidCPF': 'CPF inválido',
    'error.network': 'Error de conexión',
    'error.unauthorized': 'No autorizado',
    'error.notFound': 'No encontrado',
  },
} as const;

export type TranslationKey = keyof typeof translations['pt-BR'];

/**
 * Hook para usar traduções
 */
export function useTranslation(locale: SupportedLocale = 'pt-BR') {
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[locale][key as keyof typeof translations[typeof locale]] || key;

    // Substituir parâmetros no texto
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{{${param}}}`, String(value));
      });
    }

    return text;
  };

  const localeConfig = locales[locale];

  return {
    t,
    locale,
    config: localeConfig,
    formatDate: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        ...localeConfig.dateFormat !== 'dd/MM/yyyy' ? { dateStyle: 'short' as const } : {},
      }).format(d);
    },
    formatTime: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    },
    formatDateTime: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(d);
    },
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, {
        ...localeConfig.numberFormat,
        ...options,
      }).format(value);
    },
    formatCurrency: (value: number) => {
      return new Intl.NumberFormat(locale, {
        ...localeConfig.currencyFormat,
      }).format(value);
    },
    formatPercent: (value: number) => {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(value / 100);
    },
  };
}

/**
 * Hook para detectar idioma preferido do navegador
 */
export function useBrowserLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'pt-BR';

  const browserLang = navigator.language as SupportedLocale;
  return ['pt-BR', 'en-US', 'es-ES'].includes(browserLang) ? browserLang : 'pt-BR';
}
