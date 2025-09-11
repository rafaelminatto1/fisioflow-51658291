import { useState, useEffect } from 'react';

// Interfaces para o sistema de gamificação
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  category: 'exercise' | 'consistency' | 'progress' | 'social' | 'milestone';
  requirement: {
    type: 'exercise_count' | 'streak_days' | 'points_total' | 'protocol_complete' | 'custom';
    value: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  };
  unlocked: boolean;
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: string;
  category: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  startDate: string;
  endDate: string;
  target: {
    type: 'exercise_minutes' | 'exercise_count' | 'streak_days' | 'points';
    value: number;
  };
  progress: number;
  reward: {
    points: number;
    badge?: string;
    achievement?: string;
  };
  status: 'active' | 'completed' | 'expired';
  participants: number;
}

export interface UserProgress {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalPoints: number;
  streak: {
    current: number;
    longest: number;
    lastActivity: string;
  };
  stats: {
    totalExercises: number;
    totalMinutes: number;
    protocolsCompleted: number;
    averageSessionTime: number;
    favoriteExerciseType: string;
  };
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  type: 'discount' | 'free_session' | 'merchandise' | 'feature_unlock';
  cost: number; // em pontos
  available: boolean;
  claimed: boolean;
  claimedAt?: string;
  expiresAt?: string;
  image?: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatar?: string;
  points: number;
  level: number;
  rank: number;
  streak: number;
  badge?: string;
}

export interface GamificationStats {
  totalUsers: number;
  activeUsers: number;
  averageLevel: number;
  topPerformers: LeaderboardEntry[];
  popularChallenges: Challenge[];
  recentAchievements: Achievement[];
}

// Mock data
const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_exercise',
    title: 'Primeiro Passo',
    description: 'Complete seu primeiro exercício',
    icon: '🎯',
    points: 50,
    category: 'milestone',
    requirement: { type: 'exercise_count', value: 1 },
    unlocked: true,
    unlockedAt: '2024-01-15T10:00:00Z',
    rarity: 'common'
  },
  {
    id: 'week_streak',
    title: 'Consistência',
    description: 'Mantenha uma sequência de 7 dias',
    icon: '🔥',
    points: 200,
    category: 'consistency',
    requirement: { type: 'streak_days', value: 7 },
    unlocked: true,
    unlockedAt: '2024-01-22T18:30:00Z',
    rarity: 'rare'
  },
  {
    id: 'hundred_exercises',
    title: 'Centenário',
    description: 'Complete 100 exercícios',
    icon: '💯',
    points: 500,
    category: 'exercise',
    requirement: { type: 'exercise_count', value: 100 },
    unlocked: false,
    rarity: 'epic'
  },
  {
    id: 'protocol_master',
    title: 'Mestre dos Protocolos',
    description: 'Complete 10 protocolos diferentes',
    icon: '👑',
    points: 1000,
    category: 'progress',
    requirement: { type: 'protocol_complete', value: 10 },
    unlocked: false,
    rarity: 'legendary'
  }
];

const MOCK_BADGES: Badge[] = [
  {
    id: 'early_bird',
    name: 'Madrugador',
    description: 'Exercitou-se antes das 8h',
    icon: '🌅',
    color: '#FFD700',
    earnedAt: '2024-01-16T07:30:00Z',
    category: 'timing'
  },
  {
    id: 'weekend_warrior',
    name: 'Guerreiro do Fim de Semana',
    description: 'Manteve a rotina no fim de semana',
    icon: '⚔️',
    color: '#FF6B6B',
    earnedAt: '2024-01-20T16:00:00Z',
    category: 'consistency'
  }
];

const MOCK_CHALLENGES: Challenge[] = [
  {
    id: 'daily_stretch',
    title: 'Alongamento Diário',
    description: 'Faça 10 minutos de alongamento hoje',
    type: 'daily',
    startDate: '2024-01-25T00:00:00Z',
    endDate: '2024-01-25T23:59:59Z',
    target: { type: 'exercise_minutes', value: 10 },
    progress: 7,
    reward: { points: 50 },
    status: 'active',
    participants: 156
  },
  {
    id: 'weekly_consistency',
    title: 'Semana Consistente',
    description: 'Exercite-se todos os dias desta semana',
    type: 'weekly',
    startDate: '2024-01-22T00:00:00Z',
    endDate: '2024-01-28T23:59:59Z',
    target: { type: 'streak_days', value: 7 },
    progress: 4,
    reward: { points: 300, badge: 'consistency_champion' },
    status: 'active',
    participants: 89
  },
  {
    id: 'monthly_marathon',
    title: 'Maratona Mensal',
    description: 'Acumule 500 minutos de exercício este mês',
    type: 'monthly',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-31T23:59:59Z',
    target: { type: 'exercise_minutes', value: 500 },
    progress: 320,
    reward: { points: 1000, achievement: 'monthly_champion' },
    status: 'active',
    participants: 234
  }
];

const MOCK_USER_PROGRESS: UserProgress = {
  level: 8,
  currentXP: 1250,
  xpToNextLevel: 1500,
  totalPoints: 3420,
  streak: {
    current: 12,
    longest: 18,
    lastActivity: '2024-01-25T14:30:00Z'
  },
  stats: {
    totalExercises: 87,
    totalMinutes: 1240,
    protocolsCompleted: 6,
    averageSessionTime: 14.2,
    favoriteExerciseType: 'Fortalecimento'
  }
};

const MOCK_REWARDS: Reward[] = [
  {
    id: 'session_discount',
    title: '10% de Desconto',
    description: 'Desconto na próxima sessão',
    type: 'discount',
    cost: 500,
    available: true,
    claimed: false
  },
  {
    id: 'free_assessment',
    title: 'Avaliação Gratuita',
    description: 'Uma avaliação completa gratuita',
    type: 'free_session',
    cost: 1000,
    available: true,
    claimed: false
  },
  {
    id: 'premium_features',
    title: 'Recursos Premium',
    description: 'Acesso a recursos premium por 1 mês',
    type: 'feature_unlock',
    cost: 2000,
    available: true,
    claimed: false
  },
  {
    id: 'tshirt',
    title: 'Camiseta FisioFlow',
    description: 'Camiseta exclusiva da clínica',
    type: 'merchandise',
    cost: 1500,
    available: false,
    claimed: false
  }
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    userId: '1',
    userName: 'Ana Silva',
    points: 4250,
    level: 12,
    rank: 1,
    streak: 25,
    badge: 'consistency_champion'
  },
  {
    userId: '2',
    userName: 'Carlos Santos',
    points: 3890,
    level: 11,
    rank: 2,
    streak: 18
  },
  {
    userId: '3',
    userName: 'Maria Oliveira',
    points: 3420,
    level: 8,
    rank: 3,
    streak: 12
  },
  {
    userId: '4',
    userName: 'João Costa',
    points: 3100,
    level: 9,
    rank: 4,
    streak: 8
  },
  {
    userId: '5',
    userName: 'Lucia Ferreira',
    points: 2850,
    level: 7,
    rank: 5,
    streak: 15
  }
];

export const useGamification = () => {
  const [achievements, setAchievements] = useState<Achievement[]>(MOCK_ACHIEVEMENTS);
  const [badges, setBadges] = useState<Badge[]>(MOCK_BADGES);
  const [challenges, setChallenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [userProgress, setUserProgress] = useState<UserProgress>(MOCK_USER_PROGRESS);
  const [rewards, setRewards] = useState<Reward[]>(MOCK_REWARDS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simular carregamento inicial
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Funções para gerenciar conquistas
  const unlockAchievement = async (achievementId: string): Promise<boolean> => {
    try {
      setAchievements(prev => prev.map(achievement => 
        achievement.id === achievementId 
          ? { ...achievement, unlocked: true, unlockedAt: new Date().toISOString() }
          : achievement
      ));
      
      // Adicionar pontos ao usuário
      const achievement = achievements.find(a => a.id === achievementId);
      if (achievement) {
        setUserProgress(prev => ({
          ...prev,
          totalPoints: prev.totalPoints + achievement.points,
          currentXP: prev.currentXP + achievement.points
        }));
      }
      
      return true;
    } catch (err) {
      setError('Erro ao desbloquear conquista');
      return false;
    }
  };

  const checkAchievements = (activityData: {
    exerciseCount?: number;
    streakDays?: number;
    totalPoints?: number;
    protocolsCompleted?: number;
  }) => {
    const newUnlocks: string[] = [];
    
    achievements.forEach(achievement => {
      if (!achievement.unlocked) {
        let shouldUnlock = false;
        
        switch (achievement.requirement.type) {
          case 'exercise_count':
            shouldUnlock = (activityData.exerciseCount || 0) >= achievement.requirement.value;
            break;
          case 'streak_days':
            shouldUnlock = (activityData.streakDays || 0) >= achievement.requirement.value;
            break;
          case 'points_total':
            shouldUnlock = (activityData.totalPoints || 0) >= achievement.requirement.value;
            break;
          case 'protocol_complete':
            shouldUnlock = (activityData.protocolsCompleted || 0) >= achievement.requirement.value;
            break;
        }
        
        if (shouldUnlock) {
          newUnlocks.push(achievement.id);
        }
      }
    });
    
    return newUnlocks;
  };

  // Funções para gerenciar desafios
  const joinChallenge = async (challengeId: string): Promise<boolean> => {
    try {
      setChallenges(prev => prev.map(challenge => 
        challenge.id === challengeId 
          ? { ...challenge, participants: challenge.participants + 1 }
          : challenge
      ));
      return true;
    } catch (err) {
      setError('Erro ao participar do desafio');
      return false;
    }
  };

  const updateChallengeProgress = async (challengeId: string, progress: number): Promise<boolean> => {
    try {
      setChallenges(prev => prev.map(challenge => {
        if (challenge.id === challengeId) {
          const newProgress = Math.min(progress, challenge.target.value);
          const status = newProgress >= challenge.target.value ? 'completed' : challenge.status;
          return { ...challenge, progress: newProgress, status };
        }
        return challenge;
      }));
      return true;
    } catch (err) {
      setError('Erro ao atualizar progresso do desafio');
      return false;
    }
  };

  // Funções para gerenciar recompensas
  const claimReward = async (rewardId: string): Promise<boolean> => {
    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward || !reward.available || reward.claimed) {
        throw new Error('Recompensa não disponível');
      }
      
      if (userProgress.totalPoints < reward.cost) {
        throw new Error('Pontos insuficientes');
      }
      
      setRewards(prev => prev.map(r => 
        r.id === rewardId 
          ? { ...r, claimed: true, claimedAt: new Date().toISOString() }
          : r
      ));
      
      setUserProgress(prev => ({
        ...prev,
        totalPoints: prev.totalPoints - reward.cost
      }));
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao resgatar recompensa');
      return false;
    }
  };

  // Funções para atualizar progresso do usuário
  const addExerciseActivity = async (minutes: number, exerciseType: string): Promise<void> => {
    try {
      setUserProgress(prev => {
        const newStats = {
          ...prev.stats,
          totalExercises: prev.stats.totalExercises + 1,
          totalMinutes: prev.stats.totalMinutes + minutes,
          averageSessionTime: (prev.stats.totalMinutes + minutes) / (prev.stats.totalExercises + 1)
        };
        
        const points = Math.floor(minutes * 2); // 2 pontos por minuto
        const newXP = prev.currentXP + points;
        const newLevel = Math.floor(newXP / 200) + 1; // Level up a cada 200 XP
        
        return {
          ...prev,
          currentXP: newXP,
          level: newLevel,
          xpToNextLevel: (newLevel * 200) - newXP,
          totalPoints: prev.totalPoints + points,
          stats: newStats,
          streak: {
            ...prev.streak,
            current: prev.streak.current + 1,
            longest: Math.max(prev.streak.longest, prev.streak.current + 1),
            lastActivity: new Date().toISOString()
          }
        };
      });
      
      // Verificar conquistas
      const newUnlocks = checkAchievements({
        exerciseCount: userProgress.stats.totalExercises + 1,
        streakDays: userProgress.streak.current + 1,
        totalPoints: userProgress.totalPoints
      });
      
      // Desbloquear conquistas automaticamente
      newUnlocks.forEach(achievementId => {
        unlockAchievement(achievementId);
      });
      
    } catch (err) {
      setError('Erro ao registrar atividade');
    }
  };

  // Funções de filtro e busca
  const getAchievementsByCategory = (category: Achievement['category']) => {
    return achievements.filter(achievement => achievement.category === category);
  };

  const getUnlockedAchievements = () => {
    return achievements.filter(achievement => achievement.unlocked);
  };

  const getActiveChallenges = () => {
    return challenges.filter(challenge => challenge.status === 'active');
  };

  const getAvailableRewards = () => {
    return rewards.filter(reward => reward.available && !reward.claimed);
  };

  const getUserRank = () => {
    const userEntry = leaderboard.find(entry => entry.userId === '3'); // Usuário atual
    return userEntry?.rank || 0;
  };

  const getStats = (): GamificationStats => {
    return {
      totalUsers: leaderboard.length,
      activeUsers: leaderboard.filter(entry => entry.streak > 0).length,
      averageLevel: leaderboard.reduce((sum, entry) => sum + entry.level, 0) / leaderboard.length,
      topPerformers: leaderboard.slice(0, 3),
      popularChallenges: challenges.filter(c => c.participants > 50),
      recentAchievements: achievements.filter(a => a.unlocked).slice(-5)
    };
  };

  return {
    // Estado
    achievements,
    badges,
    challenges,
    userProgress,
    rewards,
    leaderboard,
    loading,
    error,
    
    // Ações
    unlockAchievement,
    checkAchievements,
    joinChallenge,
    updateChallengeProgress,
    claimReward,
    addExerciseActivity,
    
    // Filtros e consultas
    getAchievementsByCategory,
    getUnlockedAchievements,
    getActiveChallenges,
    getAvailableRewards,
    getUserRank,
    getStats
  };
};