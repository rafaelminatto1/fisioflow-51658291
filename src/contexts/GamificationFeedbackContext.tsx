import React, { createContext, useContext, useState, useCallback } from 'react';
import { XpGainToast } from '@/components/gamification/XpGainToast';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface GamificationFeedbackContextType {
  awardXpFeedback: (amount: number, reason?: string) => void;
  levelUpFeedback: (level: number) => void;
}

const GamificationFeedbackContext = createContext<GamificationFeedbackContextType | undefined>(undefined);

// Global reference for utility files
let globalAwardXpFeedback: ((amount: number, reason?: string) => void) | null = null;
let globalLevelUpFeedback: ((level: number) => void) | null = null;

export const triggerXpFeedbackGlobal = (amount: number, reason?: string) => {
  if (globalAwardXpFeedback) globalAwardXpFeedback(amount, reason);
};

export const triggerLevelUpFeedbackGlobal = (level: number) => {
  if (globalLevelUpFeedback) globalLevelUpFeedback(level);
};

export function GamificationFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [activeXpToasts, setActiveXpToasts] = useState<Array<{ id: number; amount: number; reason?: string }>>([]);

  const awardXpFeedback = useCallback((amount: number, reason?: string) => {
    const id = Date.now();
    setActiveXpToasts(prev => [...prev, { id, amount, reason }]);
  }, []);

  const levelUpFeedback = useCallback((level: number) => {
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#EAB308', '#A855F7', '#EC4899']
    });
    
    toast.success(`NÍVEL ${level} ALCANÇADO!`, {
      description: 'Parabéns! Sua evolução é inspiradora.',
      icon: '🏆',
      duration: 6000,
    });
  }, []);

  // Update global refs
  globalAwardXpFeedback = awardXpFeedback;
  globalLevelUpFeedback = levelUpFeedback;

  const removeXpToast = useCallback((id: number) => {
    setActiveXpToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <GamificationFeedbackContext.Provider value={{ awardXpFeedback, levelUpFeedback }}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col items-center justify-end p-8 gap-4">
        {activeXpToasts.map(t => (
          <XpGainToast 
            key={t.id} 
            amount={t.amount} 
            reason={t.reason} 
            onClose={() => removeXpToast(t.id)} 
          />
        ))}
      </div>
    </GamificationFeedbackContext.Provider>
  );
}

export const useGamificationFeedback = () => {
  const context = useContext(GamificationFeedbackContext);
  if (!context) {
    throw new Error('useGamificationFeedback must be used within a GamificationFeedbackProvider');
  }
  return context;
};
