
/**
 * Gamification Notification Service
 * Provides pre-configured toast notifications for gamification events
 */

import { toast } from '@/hooks/use-toast';
import { Trophy, Flame, Zap, Star, Award, Target, Gift } from 'lucide-react';

export class GamificationNotificationService {
  /**
   * Show XP awarded notification
   */
  static xpAwarded(amount: number, description: string, leveledUp = false) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <span>+{amount} XP</span>
        </div>
      ) as any,
      description: (leveledUp
        ? (
          <div className="space-y-1">
            <p>{description}</p>
            <p className="font-semibold text-yellow-600 dark:text-yellow-400">
              🎉 Subiu de nível!
            </p>
          </div>
        )
        : description) as any,
      variant: leveledUp ? 'default' : 'default',
    } as any);
  }

  /**
   * Show achievement unlocked notification
   */
  static achievementUnlocked(title: string, description: string, xpReward: number) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          <span>Conquista Desbloqueada!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
            +{xpReward} XP
          </p>
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }

  /**
   * Show quest completed notification
   */
  static questCompleted(title: string, xpReward: number) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          <span>Missão Concluída!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-1">
          <p>{title}</p>
          <p className="text-xs font-semibold text-green-600 dark:text-green-400">
            +{xpReward} XP
          </p>
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }

  /**
   * Show level up notification
   */
  static levelUp(newLevel: number, rewards?: { title: string; description: string }[]) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span>Parabéns!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-2">
          <p className="font-semibold text-lg">Você alcançou o nível <span className="text-yellow-600">{newLevel}</span>!</p>
          {rewards && rewards.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Recompensas desbloqueadas:</p>
              {rewards.map((reward, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium">{reward.title}</span>: {reward.description}
                </div>
              ))}
            </div>
          )}
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }

  /**
   * Show streak milestone notification
   */
  static streakMilestone(days: number, bonusXP: number) {
    let message = '';
    let emoji = '';

    if (days >= 30) {
      message = '30 dias consecutivos! Dedicação incrível!';
      emoji = '🏆';
    } else if (days >= 14) {
      message = '2 semanas de dedicação!';
      emoji = '💪';
    } else if (days >= 7) {
      message = '7 dias seguidos!';
      emoji = '🔥';
    } else if (days >= 3) {
      message = '3 dias consecutivos!';
      emoji = '⚡';
    }

    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <span>Sequência de {days} dias!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-1">
          <p className="font-semibold">{emoji} {message}</p>
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
            Bônus: +{bonusXP} XP
          </p>
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }

  /**
   * Show reward purchased notification
   */
  static rewardPurchased(itemName: string, cost: number) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-cyan-500" />
          <span>Compra Realizada!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-1">
          <p>Você comprou: <span className="font-semibold">{itemName}</span></p>
          <p className="text-xs text-muted-foreground">
            -{cost} pontos
          </p>
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }

  /**
   * Show all daily quests completed notification
   */
  static allQuestsCompleted(totalXP: number) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <span>Dia Perfeito!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-1">
          <p className="font-semibold">Todas as missões diárias concluídas!</p>
          <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
            +{totalXP} XP total
          </p>
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }

  /**
   * Show milestone reached notification
   */
  static milestoneReached(milestone: string, reward: string) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span>Marco Alcançado!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-1">
          <p className="font-semibold">{milestone}</p>
          <p className="text-sm text-muted-foreground">{reward}</p>
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }

  /**
   * Show leaderboard position changed notification
   */
  static leaderboardPositionChanged(newPosition: number, movedUp: boolean) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span>Ranking Atualizado!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-1">
          <p className="font-semibold">
            {movedUp ? '📈 Você subiu' : '📉 Você desceu'} no ranking
          </p>
          <p className="text-sm text-muted-foreground">
            Posição atual: #{newPosition}
          </p>
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }

  /**
   * Show bonus XP notification (special events, first login, etc)
   */
  static bonusXP(amount: number, reason: string) {
    return toast({
      title: (
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <span>Bônus de XP!</span>
        </div>
      ) as any,
      description: (
        <div className="space-y-1">
          <p>{reason}</p>
          <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
            +{amount} XP
          </p>
        </div>
      ) as any,
      variant: 'default',
    } as any);
  }
}

/**
 * Hook for using gamification notifications in components
 */
export const useGamificationNotifications = () => ({
  xpAwarded: GamificationNotificationService.xpAwarded,
  achievementUnlocked: GamificationNotificationService.achievementUnlocked,
  questCompleted: GamificationNotificationService.questCompleted,
  levelUp: GamificationNotificationService.levelUp,
  streakMilestone: GamificationNotificationService.streakMilestone,
  rewardPurchased: GamificationNotificationService.rewardPurchased,
  allQuestsCompleted: GamificationNotificationService.allQuestsCompleted,
  milestoneReached: GamificationNotificationService.milestoneReached,
  leaderboardPositionChanged: GamificationNotificationService.leaderboardPositionChanged,
  bonusXP: GamificationNotificationService.bonusXP,
});
