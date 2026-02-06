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
