/**
 * Hook para traduções de gamificação
 *
 * Fornece traduções específicas para o sistema de gamificação
 */

import { useTranslation, SupportedLocale } from '@/lib/i18n';

/**
 * Chave de tradução de gamificação
 */
type GamificationTranslationKey = `gamification.${string}`;

/**
 * Hook para usar traduções de gamificação
 *
 * @example
 * ```tsx
 * const { t, locale } = useGamificationTranslation('pt-BR');
 *
 * return <h1>{t('level')} {level}</h1>; // "Nível 5"
 * ```
 */
export function useGamificationTranslation(locale?: SupportedLocale) {
  const { t: translate, config } = useTranslation(locale);

  /**
   * Tradução específica para gamificação
   */
  const t = (key: GamificationTranslationKey, params?: Record<string, string | number>): string => {
    const fullKey = `gamification.${key}` as const;

    // Tentar usar a tradução do sistema principal
    let text = translate(fullKey as `gamification.${string}`, params);

    // Se não encontrou (retornou a chave), tentar sem prefixo
    if (text === fullKey) {
      text = translate(key as `gamification.${string}`, params);
    }

    return text;
  };

  /**
   * Tradução com formatação de parâmetros
   * Substitui placeholders como {points}, {level}, etc.
   */
  const tf = (key: GamificationTranslationKey, params: Record<string, string | number>): string => {
    let text = t(key);

    // Substituir parâmetros
    Object.entries(params).forEach(([param, value]) => {
      const placeholder = `{{${param}}}`;
      const simplePlaceholder = `{${param}}`;

      text = text.replace(placeholder, String(value));
      text = text.replace(simplePlaceholder, String(value));
    });

    // Substituir condicionais como {count>1?s}
    text = text.replace(/\{(\w+)>(\d+)\?([^:]+):?([^}]*)\}/g, (match, param, value, singular, plural) => {
      const num = Number(value);
      const paramValue = params[param];

      if (paramValue !== undefined && Number(paramValue) > num) {
        return plural || '';
      }
      return singular;
    });

    return text;
  };

  /**
   * Tradução de rank
   */
  const rank = (rank: 'novice' | 'beginner' | 'experienced' | 'master' | 'legendary'): string => {
    return t(`rank.${rank}`);
  };

  /**
   * Tradução de categoria
   */
  const category = (cat: 'xp' | 'level' | 'streak' | 'achievements'): string => {
    return t(`category.${cat}`);
  };

  /**
   * Tradução de período
   */
  const period = (per: 'today' | 'week' | 'month' | 'all'): string => {
    return t(`period.${per}`);
  };

  /**
   * Tradução de título de nível
   */
  const levelTitle = (title: 'novato' | 'iniciante' | 'aprendiz' | 'dedicado' | 'experiente' | 'veterano' | 'mestre' | 'graoMestre' | 'lendario' | 'imortal'): string => {
    return t(`levelTitle.${title}`);
  };

  /**
   * Formatar número de XP
   */
  const formatXP = (xp: number): string => {
    return config.formatNumber(xp);
  };

  /**
   * Formatar porcentagem
   */
  const formatPercent = (value: number): string => {
    return config.formatPercent(value);
  };

  /**
   * Formatar data relativa
   */
  const formatRelativeDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('period.today');
    if (diffDays === 1) return locale === 'pt-BR' ? 'Ontem' : 'Yesterday';
    if (diffDays < 7) return locale === 'pt-BR' ? `${diffDays} dias atrás` : `${diffDays} days ago`;
    if (diffDays < 30) return locale === 'pt-BR' ? `${Math.floor(diffDays / 7)} semanas atrás` : `${Math.floor(diffDays / 7)} weeks ago`;

    return config.formatDate(d);
  };

  return {
    t,
    tf,
    rank,
    category,
    period,
    levelTitle,
    formatXP,
    formatPercent,
    formatRelativeDate,
    locale: config.code,
    config
  };
}

/**
 * Hook simplificado para traduções de gamificação em português
 */
export function useGamificationPT() {
  return useGamificationTranslation('pt-BR');
}

/**
 * Hook simplificado para traduções de gamificação em inglês
 */
export function useGamificationEN() {
  return useGamificationTranslation('en-US');
}

/**
 * Constantes de traduções de gamificação para uso direto
 */
export const GAMIFICATION_TRANSLATIONS = {
  'pt-BR': {
    levelUp: 'Parabéns! Você subiu de nível!',
    achievementUnlocked: 'Achievement desbloqueado!',
    questCompleted: 'Quest completada!',
    streakMilestone: 'Novo marco de streak!',
    pointsEarned: '+{points} XP ganhos!',
    nextLevelIn: 'Próximo nível em {xp} XP',
    daysStreak: '{days} dias seguidos',
    achievementsUnlocked: '{count} de {total} conquistas',
  },
  'en-US': {
    levelUp: 'Congratulations! You leveled up!',
    achievementUnlocked: 'Achievement unlocked!',
    questCompleted: 'Quest completed!',
    streakMilestone: 'New streak milestone!',
    pointsEarned: '+{points} XP earned!',
    nextLevelIn: 'Next level in {xp} XP',
    daysStreak: '{days} day streak',
    achievementsUnlocked: '{count} of {total} achievements',
  }
} as const;
