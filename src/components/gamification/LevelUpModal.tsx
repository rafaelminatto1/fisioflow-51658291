import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: number;
}

export function LevelUpModal({ isOpen, onClose, level }: LevelUpModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: NodeJS.Timeout = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 text-white border-none shadow-2xl">
        <DialogHeader className="space-y-4 flex flex-col items-center justify-center pt-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-yellow-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="bg-gradient-to-b from-yellow-300 to-yellow-600 p-6 rounded-full shadow-lg relative z-10">
              <Trophy className="h-16 w-16 text-white drop-shadow-md" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-red-500 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
              {level}
            </div>
          </div>
          
          <DialogTitle className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
            Nível Alcançado!
          </DialogTitle>
          
          <div className="text-center space-y-2 max-w-[80%] mx-auto">
            <p className="text-indigo-100 text-lg">
              Parabéns! Você alcançou o <span className="font-bold text-yellow-300">Nível {level}</span>.
            </p>
            <p className="text-indigo-300 text-sm">
              Sua dedicação está dando resultados. Continue assim para desbloquear mais recompensas!
            </p>
          </div>
        </DialogHeader>

        <div className="flex justify-center p-6 pb-8">
          <Button 
            onClick={onClose} 
            className="bg-yellow-500 hover:bg-yellow-400 text-indigo-900 font-bold px-8 py-2 rounded-full shadow-lg transition-transform hover:scale-105"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Continuar Jornada
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
