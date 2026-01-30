import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export const triggerGamificationFeedback = (type: 'xp' | 'level_up' | 'achievement', data: { amount?: number, level?: number, title?: string }) => {
  if (type === 'xp') {
    toast.success(`+${data.amount} XP Ganho!`, {
      description: 'Continue evoluindo na sua jornada!',
      icon: '✨',
    });
  }

  if (type === 'level_up') {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0EA5E9', '#10B981', '#F59E0B']
    });
    
    toast.success(`NÍVEL ${data.level} ALCANÇADO!`, {
      description: 'Parabéns! Você desbloqueou novas recompensas.',
      icon: '🏆',
      duration: 5000,
    });
  }

  if (type === 'achievement') {
    toast.info(`CONQUISTA DESBLOQUEADA!`, {
      description: data.title,
      icon: '🏅',
      duration: 4000,
    });
  }
};
