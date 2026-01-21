import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, ArrowUpRight, X } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import confetti from 'canvas-confetti';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
}

export const LevelUpModal = ({ isOpen, onClose, newLevel }: LevelUpModalProps) => {
  React.useEffect(() => {
    if (isOpen) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function () {
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-white">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative w-full max-w-sm bg-gradient-to-b from-yellow-400 to-orange-600 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/20 rounded-full blur-3xl" />
              <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 bg-black/20 rounded-full blur-3xl" />
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="relative p-8 flex flex-col items-center text-center space-y-6">
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl"
              >
                <Trophy className="w-12 h-12 text-yellow-200" />
              </motion.div>

              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-black tracking-tight"
                >
                  NÍVEL ALCANÇADO!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-yellow-100 font-medium"
                >
                  Você está progredindo muito bem!
                </motion.p>
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="flex items-center justify-center gap-4 bg-black/20 rounded-2xl p-4 w-full border border-white/10"
              >
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Anterior</span>
                  <span className="text-2xl font-black">{newLevel - 1}</span>
                </div>
                <ArrowUpRight className="w-6 h-6 text-yellow-300" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Atual</span>
                  <span className="text-4xl font-black text-yellow-300">{newLevel}</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full pt-4"
              >
                <Button
                  onClick={onClose}
                  className="w-full bg-white text-orange-600 hover:bg-yellow-50 h-14 rounded-2xl text-lg font-bold shadow-lg border-none"
                >
                  Continuar Jornada
                </Button>
              </motion.div>

              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <Star className="w-4 h-4 text-yellow-200 fill-yellow-200 opacity-40" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LevelUpModal;
