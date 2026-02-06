/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { toast } from 'sonner';
import { Trophy, Star, Flame, Zap, Target, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationData {
  type: 'level_up' | 'achievement' | 'streak' | 'xp_milestone' | 'quest_complete';
  title: string;
  message: string;
  xp?: number;
  level?: number;
  achievementIcon?: string;
  actionLabel?: string;
  action?: () => void;
}

interface GamificationNotificationsProps {
  notifications?: NotificationData[];
  onDismiss?: (id: string) => void;
}

const NOTIFICATION_ICONS = {
  level_up: Zap,
  achievement: Trophy,
  streak: Flame,
  xp_milestone: Star,
  quest_complete: Target,
};

const NOTIFICATION_COLORS = {
  level_up: 'from-purple-500 to-pink-500',
  achievement: 'from-yellow-500 to-orange-500',
  streak: 'from-orange-500 to-red-500',
  xp_milestone: 'from-green-500 to-emerald-500',
  quest_complete: 'from-blue-500 to-cyan-500',
};

 
export function useGamificationNotifications() {
  const [notifications, setNotifications] = useState<Map<string, NotificationData>>(new Map());

  const showNotification = (id: string, data: NotificationData) => {
    setNotifications(prev => new Map(prev).set(id, data));

    // Mostrar toast
    const Icon = NOTIFICATION_ICONS[data.type];
    toast.success(data.title, {
      description: data.message,
      icon: <Icon className="h-5 w-5" />,
      action: data.action ? {
        label: data.actionLabel || 'Ver',
        onClick: data.action,
      } : undefined,
      duration: 5000,
    });
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const clearAll = () => {
    setNotifications(new Map());
  };

  // Notificações predefinidas
  const notifyLevelUp = (level: number, xpBonus: number) => {
    const id = `level-${level}-${Date.now()}`;
    showNotification(id, {
      type: 'level_up',
      title: `PARABÉNS! Você alcançou o Nível ${level}! 🎉`,
      message: `Continue assim para desbloquear novas conquistas!`,
      xp: xpBonus,
      level,
    });
  };

  const notifyAchievement = (title: string, description: string, xpReward: number, icon?: string) => {
    const id = `achievement-${title}-${Date.now()}`;
    showNotification(id, {
      type: 'achievement',
      title: `Conquista Desbloqueada: ${title}`,
      message: description,
      xp: xpReward,
      achievementIcon: icon,
    });
  };

  const notifyStreak = (days: number, xpBonus: number) => {
    const id = `streak-${days}-${Date.now()}`;
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    const isMilestone = milestones.includes(days);

    showNotification(id, {
      type: 'streak',
      title: isMilestone
        ? `Incrível! ${days} dias seguidos! 🔥`
        : `${days} dias seguidos!`,
      message: isMilestone
        ? `Você ganhou ${xpBonus} XP de bônus por sua consistência!`
        : 'Continue praticando diariamente!',
      xp: xpBonus,
    });
  };

  const notifyXPMilestone = (totalXP: number) => {
    const id = `xp-milestone-${totalXP}-${Date.now()}`;
    const milestones = [1000, 5000, 10000, 25000, 50000, 100000];
    const nextMilestone = milestones.find(m => m > totalXP);

    if (milestones.includes(totalXP)) {
      showNotification(id, {
        type: 'xp_milestone',
        title: `Maravilha! ${totalXP} XP acumulados! ⭐`,
        message: nextMilestone
          ? `Faltam apenas ${nextMilestone - totalXP} XP para o próximo marco!`
          : 'Você é um lendário!',
      });
    }
  };

  const notifyQuestComplete = (title: string, xpReward: number) => {
    const id = `quest-${title}-${Date.now()}`;
    showNotification(id, {
      type: 'quest_complete',
      title: `Quest Completa: ${title}`,
      message: `+${xpReward} XP ganhos`,
      xp: xpReward,
    });
  };

  return {
    notifications: Array.from(notifications.entries()).map(([id, data]) => ({ id, data })),
    showNotification,
    dismissNotification,
    clearAll,
    notifyLevelUp,
    notifyAchievement,
    notifyStreak,
    notifyXPMilestone,
    notifyQuestComplete,
  };
}

export function GamificationToast({ data, onDismiss }: { data: NotificationData; onDismiss: () => void }) {
  const Icon = NOTIFICATION_ICONS[data.type];
  const gradient = NOTIFICATION_COLORS[data.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="relative overflow-hidden"
    >
      <Card className="border-none shadow-xl">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r opacity-10",
          gradient
        )} />
        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-3 rounded-full bg-gradient-to-br text-white",
              gradient
            )}>
              {data.achievementIcon === 'Medal' ? (
                <Medal className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-sm">{data.title}</p>
              <p className="text-sm text-muted-foreground">{data.message}</p>
              {data.xp && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-semibold text-green-600">+{data.xp} XP</span>
                </div>
              )}
              {data.level && (
                <Badge variant="secondary" className="mt-2">
                  Nível {data.level}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onDismiss}
            >
              ×
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function GamificationNotificationContainer({ notifications, onDismiss }: GamificationNotificationsProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications?.map(({ id, data }) => (
          <div key={id} className="pointer-events-auto">
            <GamificationToast data={data} onDismiss={() => onDismiss?.(id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default GamificationNotifications;
