import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Star, Sparkles, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  unlockedFeatures?: string[];
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  level,
  unlockedFeatures = []
}) => {
  useEffect(() => {
    if (isOpen) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-none bg-gradient-to-b from-primary/20 to-background shadow-2xl overflow-hidden rounded-3xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
        
        <DialogHeader className="text-center pt-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-background"
          >
            <Trophy className="h-12 w-12 text-primary-foreground" />
          </motion.div>
          
          <DialogTitle className="text-3xl font-black tracking-tight text-foreground">
            NOVO NÍVEL!
          </DialogTitle>
          <DialogDescription className="text-lg font-medium text-primary">
            Você alcançou o Nível {level}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Recompensas Desbloqueadas
            </h4>
            <div className="space-y-3">
              {unlockedFeatures.length > 0 ? unlockedFeatures.map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="flex items-center gap-3 text-sm font-semibold text-foreground/80"
                >
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {feature}
                </motion.div>
              )) : (
                <>
                  <div className="flex items-center gap-3 text-sm font-semibold text-foreground/80">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    Bônus de +500 Pontos na Loja
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-foreground/80">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    Nova Insígnia de Veterano
                  </div>
                </>
              )}
            </div>
          </div>

          <Button 
            onClick={onClose} 
            className="w-full h-12 rounded-2xl font-bold text-lg bg-primary hover:scale-[1.02] transition-transform shadow-lg"
          >
            Continuar Jornada
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};