/**
 * Sistema de Reputação e Títulos
 *
 * Define títulos baseados em nível e achievements para pacientes
 */


/**
 * Título baseado em nível
 */

import { UnlockedAchievement } from '@/types/gamification';

export interface LevelTitle {
  level: number;
  title: string;
  titleEn: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Título especial baseado em achievements
 */
export interface AchievementTitle {
  code: string;
  title: string;
  titleEn: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Reputação completa do paciente
 */
export interface PatientReputation {
  levelTitle: LevelTitle;
  achievementTitles: AchievementTitle[];
  primaryTitle: string;
  rank: 'novice' | 'beginner' | 'experienced' | 'master' | 'legendary';
  rankColor: string;
}

/**
 * Faixas de nível e títulos correspondentes
 */
export const LEVEL_TITLES: LevelTitle[] = [
  {
    level: 1,
    title: 'Novato',
    titleEn: 'Novice',
    icon: '🌱',
    color: 'text-gray-500',
    description: 'Iniciando sua jornada de reabilitação'
  },
  {
    level: 5,
    title: 'Iniciante',
    titleEn: 'Beginner',
    icon: '🌿',
    color: 'text-green-500',
    description: 'Começando a entender os exercícios'
  },
  {
    level: 10,
    title: 'Aprendiz',
    titleEn: 'Apprentice',
    icon: '📚',
    color: 'text-blue-500',
    description: 'Em busca de conhecimento'
  },
  {
    level: 15,
    title: 'Dedicado',
    titleEn: 'Dedicated',
    icon: '💪',
    color: 'text-blue-600',
    description: 'Comprometido com sua recuperação'
  },
  {
    level: 20,
    title: 'Experiente',
    titleEn: 'Experienced',
    icon: '⭐',
    color: 'text-yellow-500',
    description: 'Conhecendo seu corpo'
  },
  {
    level: 30,
    title: 'Veterano',
    titleEn: 'Veteran',
    icon: '🏅',
    color: 'text-yellow-600',
    description: 'Anos de dedicação'
  },
  {
    level: 40,
    title: 'Mestre',
    titleEn: 'Master',
    icon: '👑',
    color: 'text-purple-500',
    description: 'Dominando sua reabilitação'
  },
  {
    level: 50,
    title: 'Grão-Mestre',
    titleEn: 'Grandmaster',
    icon: '🏆',
    color: 'text-purple-600',
    description: 'Exemplo de superação'
  },
  {
    level: 75,
    title: 'Lendário',
    titleEn: 'Legendary',
    icon: '🌟',
    color: 'text-amber-500',
    description: 'Lenda da reabilitação'
  },
  {
    level: 100,
    title: 'Imortal',
    titleEn: 'Immortal',
    icon: '💎',
    color: 'text-amber-600',
    description: 'Além dos limites'
  }
];

/**
 * Títulos especiais baseados em achievements
 */
export const ACHIEVEMENT_TITLES: AchievementTitle[] = [
  {
    code: 'streak_30',
    title: 'Fênix',
    titleEn: 'Phoenix',
    icon: '🔥',
    color: 'text-orange-500',
    description: '30 dias de consistência'
  },
  {
    code: 'streak_60',
    title: 'Guardião da Chama',
    titleEn: 'Flame Keeper',
    icon: '🔥',
    color: 'text-orange-600',
    description: '60 dias ininterruptos'
  },
  {
    code: 'streak_90',
    title: 'Lendário da Consistência',
    titleEn: 'Legendary Consistency',
    icon: '💫',
    color: 'text-orange-700',
    description: '90 dias de dedicação'
  },
  {
    code: 'sessions_100',
    title: 'Guerreiro de Ferro',
    titleEn: 'Iron Warrior',
    icon: '🛡️',
    color: 'text-gray-500',
    description: '100 sessões completadas'
  },
  {
    code: 'level_50',
    title: 'Titã da Reabilitação',
    titleEn: 'Rehab Titan',
    icon: '⚡',
    color: 'text-yellow-500',
    description: 'Nível 50 alcançado'
  },
  {
    code: 'pain_free',
    title: 'Mestre do Alívio',
    titleEn: 'Relief Master',
    icon: '🌈',
    color: 'text-green-500',
    description: 'Conquistou o alívio da dor'
  },
  {
    code: 'early_bird',
    title: 'Madrugador',
    titleEn: 'Early Bird',
    icon: '🌅',
    color: 'text-sky-500',
    description: 'Sessões matinais'
  },
  {
    code: 'night_owl',
    title: 'Noturno',
    titleEn: 'Night Owl',
    icon: '🦉',
    color: 'text-indigo-500',
    description: 'Sessões noturnas'
  },
  {
    code: 'weekend_warrior',
    title: 'Guerreiro de Fim de Semana',
    titleEn: 'Weekend Warrior',
    icon: '⚔️',
    color: 'text-emerald-500',
    description: 'Dedicado nos fins de semana'
  },
  {
    code: 'precision_total',
    title: 'Perfeccionista',
    titleEn: 'Perfectionist',
    icon: '🎯',
    color: 'text-red-500',
    description: 'Execução precisa'
  }
];

/**
 * Obter título baseado no nível
 */
export function getLevelTitle(level: number): LevelTitle {
  // Encontrar o título mais alto que o nível alcançou
  let title = LEVEL_TITLES[0]; // Default: Novato

  for (const levelTitle of LEVEL_TITLES) {
    if (level >= levelTitle.level) {
      title = levelTitle;
    }
  }

  return title;
}

/**
 * Obter títulos baseados em achievements desbloqueados
 */
export function getAchievementTitles(
  unlockedAchievements: UnlockedAchievement[]
): AchievementTitle[] {
  const unlockedCodes = unlockedAchievements.map(ua => {
    // Extrair code do achievement_title ou achievement_id
    const match = ua.achievement_title.match(/code:([a-z_0-9]+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  return ACHIEVEMENT_TITLES.filter(title =>
    unlockedCodes.includes(title.code)
  );
}

/**
 * Calcular reputação completa do paciente
 */
export function calculatePatientReputation(
  level: number,
  unlockedAchievements: UnlockedAchievement[]
): PatientReputation {
  const levelTitle = getLevelTitle(level);
  const achievementTitles = getAchievementTitles(unlockedAchievements);

  // Determinar rank baseado no nível
  let rank: PatientReputation['rank'] = 'novice';
  if (level >= 75) rank = 'legendary';
  else if (level >= 40) rank = 'master';
  else if (level >= 20) rank = 'experienced';
  else if (level >= 5) rank = 'beginner';

  // Cores de rank
  const rankColors: Record<PatientReputation['rank'], string> = {
    novice: 'bg-gray-500',
    beginner: 'bg-green-500',
    experienced: 'bg-blue-500',
    master: 'bg-purple-500',
    legendary: 'bg-amber-500'
  };

  // Título principal: título especial de achievement ou título de nível
  const primaryTitle = achievementTitles.length > 0
    ? achievementTitles[0].title
    : levelTitle.title;

  return {
    levelTitle,
    achievementTitles,
    primaryTitle,
    rank,
    rankColor: rankColors[rank]
  };
}

/**
 * Obter cor do rank para gradiente
 */
export function getRankGradient(rank: PatientReputation['rank']): string {
  const gradients: Record<PatientReputation['rank'], string> = {
    novice: 'from-gray-500/20 to-gray-600/20',
    beginner: 'from-green-500/20 to-green-600/20',
    experienced: 'from-blue-500/20 to-blue-600/20',
    master: 'from-purple-500/20 to-purple-600/20',
    legendary: 'from-amber-500/20 to-amber-600/20'
  };
  return gradients[rank];
}

/**
 * Obter cor do rank para borda
 */
export function getRankBorderColor(rank: PatientReputation['rank']): string {
  const borders: Record<PatientReputation['rank'], string> = {
    novice: 'border-gray-500/30',
    beginner: 'border-green-500/30',
    experienced: 'border-blue-500/30',
    master: 'border-purple-500/30',
    legendary: 'border-amber-500/30'
  };
  return borders[rank];
}

/**
 * Obter rank traduzido
 */
export function getRankLabel(rank: PatientReputation['rank'], locale: 'pt' | 'en' = 'pt'): string {
  const labels: Record<PatientReputation['rank'], { pt: string; en: string }> = {
    novice: { pt: 'Novato', en: 'Novice' },
    beginner: { pt: 'Iniciante', en: 'Beginner' },
    experienced: { pt: 'Experiente', en: 'Experienced' },
    master: { pt: 'Mestre', en: 'Master' },
    legendary: { pt: 'Lendário', en: 'Legendary' }
  };
  return labels[rank][locale];
}

/**
 * Calcular próximo título de nível
 */
export function getNextLevelTitle(currentLevel: number): LevelTitle | null {
  const nextTitle = LEVEL_TITLES.find(t => t.level > currentLevel);
  return nextTitle || null;
}

/**
 * Calcular progresso até o próximo título
 */
export function getProgressToNextTitle(
  currentLevel: number,
  _currentXp: number
): { percent: number; remaining: number; nextTitle: LevelTitle | null } {
  const nextTitle = getNextLevelTitle(currentLevel);

  if (!nextTitle) {
    return { percent: 100, remaining: 0, nextTitle: null };
  }

  // Simples: diferença de níveis
  const _levelDiff = nextTitle.level - currentLevel;
  const percent = Math.min(100, ((currentLevel - (nextTitle.level - 10)) / 10) * 100);

  return {
    percent,
    remaining: nextTitle.level - currentLevel,
    nextTitle
  };
}
