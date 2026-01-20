/**
 * Gamification Library Index
 *
 * Exporta todas as utilidades de gamificação
 */

// Reputation system
export {
  LEVEL_TITLES,
  ACHIEVEMENT_TITLES,
  getLevelTitle,
  getAchievementTitles,
  calculatePatientReputation,
  getRankGradient,
  getRankBorderColor,
  getRankLabel,
  getNextLevelTitle,
  getProgressToNextTitle
} from './reputation';

// Quest generator
export { generateSmartQuests } from './quest-generator';

// Types
export type {
  LevelTitle,
  AchievementTitle,
  PatientReputation
} from './reputation';

export type { GeneratedQuest } from './quest-generator';
