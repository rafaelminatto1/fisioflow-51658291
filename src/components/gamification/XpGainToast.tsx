import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowUpCircle } from 'lucide-react';

interface XpGainToastProps {
  amount: number;
  reason?: string;
  onClose: () => void;
}

export function XpGainToast({ amount, reason, onClose }: XpGainToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Wait for exit animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="bg-slate-900/90 backdrop-blur-md border border-yellow-500/50 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 min-w-[200px]">
            <div className="bg-yellow-500 p-2 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.6)]">
              <ArrowUpCircle className="w-6 h-6 text-slate-900" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-yellow-400">+{amount}</span>
                <span className="font-bold text-lg">XP</span>
                <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
              </div>
              {reason && (
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  {reason}
                </span>
              )}
            </div>

            {/* Partículas decorativas simples */}
            <motion.div 
              className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full"
              animate={{ y: [-10, -30], opacity: [1, 0], x: [0, 10] }}
            />
            <motion.div 
              className="absolute -bottom-2 -left-2 w-3 h-3 bg-indigo-400 rounded-full"
              animate={{ y: [10, 30], opacity: [1, 0], x: [0, -10] }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
