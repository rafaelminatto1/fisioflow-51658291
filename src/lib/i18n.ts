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

    // Gamification - Geral
    'gamification.title': 'Gamificação',
    'gamification.progress': 'Seu Progresso',
    'gamification.description': 'Complete atividades e ganhe recompensas',
    'gamification.newNotifications': 'nova{count>1?s}',

    // Gamification - Níveis
    'gamification.level': 'Nível',
    'gamification.xp': 'XP',
    'gamification.xpRequired': 'XP Necessário',
    'gamification.currentXp': 'XP Atual',
    'gamification.nextLevel': 'Próximo Nível',
    'gamification.levelUp': 'Subiu de Nível!',
    'gamification.levelUpDescription': 'Parabéns! Você alcançou um novo nível.',

    // Gamification - Streak
    'gamification.streak': 'Sequência',
    'gamification.streakDays': 'dias seguidos',
    'gamification.currentStreak': 'Streak Atual',
    'gamification.longestStreak': 'Recorde',
    'gamification.streakMilestone': 'Marco de Streak',
    'gamification.streakFrozen': 'Streak Congelado',
    'gamification.streakFreezeAvailable': 'Proteção de Streak Disponível',

    // Gamification - Pontos
    'gamification.points': 'Pontos',
    'gamification.totalPoints': 'Pontos Totais',
    'gamification.pointsEarned': '+{points} XP Ganho!',
    'gamification.pointsForShop': 'Use na loja de recompensas',
    'gamification.pointsSpent': 'Pontos Gastos',

    // Gamification - Achievements
    'gamification.achievements': 'Conquistas',
    'gamification.achievementUnlocked': 'Achievement Desbloqueado',
    'gamification.achievementsUnlocked': 'Conquistas Desbloqueadas',
    'gamification.achievementsTotal': 'de {total} conquistas',
    'gamification.viewAchievements': 'Ver Conquistas',
    'gamification.noAchievements': 'Nenhuma conquista ainda',
    'gamification.achievementProgress': 'Progresso da Conquista',

    // Gamification - Quests
    'gamification.quests': 'Missões',
    'gamification.dailyQuests': 'Quests Diárias',
    'gamification.weeklyQuests': 'Quests Semanais',
    'gamification.questCompleted': 'Quest Completada',
    'gamification.questExpired': 'Quest Expirada',
    'gamification.questsCompleted': 'de {total} quests hoje',
    'gamification.claimReward': 'Receber Recompensa',
    'gamification.questProgress': 'Progresso da Quest',

    // Gamification - Títulos
    'gamification.title': 'Título',
    'gamification.primaryTitle': 'Título Principal',
    'gamification.specialTitles': 'Títulos Especiais',
    'gamification.levelTitle': 'Título de Nível',
    'gamification.nextTitle': 'Próximo Título',
    'gamification.nextTitleIn': 'em {levels} níveis',

    // Gamification - Ranking
    'gamification.ranking': 'Ranking',
    'gamification.globalRanking': 'Ranking Global',
    'gamification.yourPosition': 'Sua Posição',
    'gamification.yourRank': 'Seu Rank',
    'gamification.topPlayers': 'Top Jogadores',
    'gamification.pointsToTop': 'Continue assim! Você está a apenas {points} pontos do topo!',

    // Gamification - Ranks
    'gamification.rank.novice': 'Novato',
    'gamification.rank.beginner': 'Iniciante',
    'gamification.rank.experienced': 'Experiente',
    'gamification.rank.master': 'Mestre',
    'gamification.rank.legendary': 'Lendário',

    // Gamification - Títulos de Nível
    'gamification.levelTitle.novato': 'Novato',
    'gamification.levelTitle.iniciante': 'Iniciante',
    'gamification.levelTitle.aprendiz': 'Aprendiz',
    'gamification.levelTitle.dedicado': 'Dedicado',
    'gamification.levelTitle.experiente': 'Experiente',
    'gamification.levelTitle.veterano': 'Veterano',
    'gamification.levelTitle.mestre': 'Mestre',
    'gamification.levelTitle.graoMestre': 'Grão-Mestre',
    'gamification.levelTitle.lendario': 'Lendário',
    'gamification.levelTitle.imortal': 'Imortal',

    // Gamification - Categorias
    'gamification.category.xp': 'Por XP',
    'gamification.category.level': 'Por Nível',
    'gamification.category.streak': 'Por Streak',
    'gamification.category.achievements': 'Por Conquistas',

    // Gamification - Períodos
    'gamification.period.today': 'Hoje',
    'gamification.period.week': 'Semana',
    'gamification.period.month': 'Mês',
    'gamification.period.all': 'Todos',

    // Gamification - Estatísticas
    'gamification.stats.totalSessions': 'Sessões Totais',
    'gamification.stats.completionRate': 'Taxa de Conclusão',
    'gamification.stats.engagementRate': 'Taxa de Engajamento',
    'gamification.stats.averageXpPerDay': 'Média de XP por Dia',
    'gamification.stats.viewStats': 'Ver Estatísticas',

    // Gamification - Loja
    'gamification.shop.title': 'Loja de Recompensas',
    'gamification.shop.buy': 'Comprar',
    'gamification.shop.notEnoughPoints': 'Pontos Insuficientes',
    'gamification.shop.itemPurchased': 'Item Comprado',
    'gamification.shop.inventory': 'Inventário',
    'gamification.shop.consumables': 'Consumíveis',
    'gamification.shop.cosmetics': 'Cosméticos',
    'gamification.shop.features': 'Funcionalidades',

    // Gamification - Notificações
    'gamification.notifications.title': 'Notificações',
    'gamification.notifications.markAsRead': 'Marcar como Lido',
    'gamification.notifications.markAllAsRead': 'Marcar Todos como Lidos',
    'gamification.notifications.noNotifications': 'Nenhuma notificação',
    'gamification.notifications.newAchievement': 'Nova Conquista',
    'gamification.notifications.newLevel': 'Novo Nível',
    'gamification.notifications.questReminder': 'Lembrete de Quest',
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

    // Gamification - General
    'gamification.title': 'Gamification',
    'gamification.progress': 'Your Progress',
    'gamification.description': 'Complete activities and earn rewards',
    'gamification.newNotifications': 'new notification{count>1?s}',

    // Gamification - Levels
    'gamification.level': 'Level',
    'gamification.xp': 'XP',
    'gamification.xpRequired': 'XP Required',
    'gamification.currentXp': 'Current XP',
    'gamification.nextLevel': 'Next Level',
    'gamification.levelUp': 'Level Up!',
    'gamification.levelUpDescription': 'Congratulations! You reached a new level.',

    // Gamification - Streak
    'gamification.streak': 'Streak',
    'gamification.streakDays': 'day streak',
    'gamification.currentStreak': 'Current Streak',
    'gamification.longestStreak': 'Record',
    'gamification.streakMilestone': 'Streak Milestone',
    'gamification.streakFrozen': 'Streak Frozen',
    'gamification.streakFreezeAvailable': 'Streak Freeze Available',

    // Gamification - Points
    'gamification.points': 'Points',
    'gamification.totalPoints': 'Total Points',
    'gamification.pointsEarned': '+{points} XP Earned!',
    'gamification.pointsForShop': 'Use in rewards shop',
    'gamification.pointsSpent': 'Points Spent',

    // Gamification - Achievements
    'gamification.achievements': 'Achievements',
    'gamification.achievementUnlocked': 'Achievement Unlocked',
    'gamification.achievementsUnlocked': 'Achievements Unlocked',
    'gamification.achievementsTotal': 'of {total} achievements',
    'gamification.viewAchievements': 'View Achievements',
    'gamification.noAchievements': 'No achievements yet',
    'gamification.achievementProgress': 'Achievement Progress',

    // Gamification - Quests
    'gamification.quests': 'Quests',
    'gamification.dailyQuests': 'Daily Quests',
    'gamification.weeklyQuests': 'Weekly Quests',
    'gamification.questCompleted': 'Quest Completed',
    'gamification.questExpired': 'Quest Expired',
    'gamification.questsCompleted': 'of {total} quests today',
    'gamification.claimReward': 'Claim Reward',
    'gamification.questProgress': 'Quest Progress',

    // Gamification - Titles
    'gamification.title': 'Title',
    'gamification.primaryTitle': 'Primary Title',
    'gamification.specialTitles': 'Special Titles',
    'gamification.levelTitle': 'Level Title',
    'gamification.nextTitle': 'Next Title',
    'gamification.nextTitleIn': 'in {levels} levels',

    // Gamification - Ranking
    'gamification.ranking': 'Ranking',
    'gamification.globalRanking': 'Global Ranking',
    'gamification.yourPosition': 'Your Position',
    'gamification.yourRank': 'Your Rank',
    'gamification.topPlayers': 'Top Players',
    'gamification.pointsToTop': 'Keep it up! You are only {points} points from the top!',

    // Gamification - Ranks
    'gamification.rank.novice': 'Novice',
    'gamification.rank.beginner': 'Beginner',
    'gamification.rank.experienced': 'Experienced',
    'gamification.rank.master': 'Master',
    'gamification.rank.legendary': 'Legendary',

    // Gamification - Level Titles
    'gamification.levelTitle.novato': 'Novice',
    'gamification.levelTitle.iniciante': 'Beginner',
    'gamification.levelTitle.aprendiz': 'Apprentice',
    'gamification.levelTitle.dedicado': 'Dedicated',
    'gamification.levelTitle.experiente': 'Experienced',
    'gamification.levelTitle.veterano': 'Veteran',
    'gamification.levelTitle.mestre': 'Master',
    'gamification.levelTitle.graoMestre': 'Grandmaster',
    'gamification.levelTitle.lendario': 'Legendary',
    'gamification.levelTitle.imortal': 'Immortal',

    // Gamification - Categories
    'gamification.category.xp': 'By XP',
    'gamification.category.level': 'By Level',
    'gamification.category.streak': 'By Streak',
    'gamification.category.achievements': 'By Achievements',

    // Gamification - Periods
    'gamification.period.today': 'Today',
    'gamification.period.week': 'Week',
    'gamification.period.month': 'Month',
    'gamification.period.all': 'All',

    // Gamification - Stats
    'gamification.stats.totalSessions': 'Total Sessions',
    'gamification.stats.completionRate': 'Completion Rate',
    'gamification.stats.engagementRate': 'Engagement Rate',
    'gamification.stats.averageXpPerDay': 'Average XP Per Day',
    'gamification.stats.viewStats': 'View Stats',

    // Gamification - Shop
    'gamification.shop.title': 'Rewards Shop',
    'gamification.shop.buy': 'Buy',
    'gamification.shop.notEnoughPoints': 'Not Enough Points',
    'gamification.shop.itemPurchased': 'Item Purchased',
    'gamification.shop.inventory': 'Inventory',
    'gamification.shop.consumables': 'Consumables',
    'gamification.shop.cosmetics': 'Cosmetics',
    'gamification.shop.features': 'Features',

    // Gamification - Notifications
    'gamification.notifications.title': 'Notifications',
    'gamification.notifications.markAsRead': 'Mark as Read',
    'gamification.notifications.markAllAsRead': 'Mark All as Read',
    'gamification.notifications.noNotifications': 'No notifications',
    'gamification.notifications.newAchievement': 'New Achievement',
    'gamification.notifications.newLevel': 'New Level',
    'gamification.notifications.questReminder': 'Quest Reminder',
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
