import React, { useCallback, useEffect, useState } from 'react';

export interface OnboardingContextValue {
  isCompleted: boolean;
  isVisible: boolean;
  start: () => void;
  dismiss: () => void;
  reset: () => void;
  complete: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

/**
 * Hook to control onboarding programmatically
 */
export function useOnboarding() {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('fisioflow_onboarding_completed');
    setIsCompleted(completed === 'true');
  }, []);

  const start = useCallback(() => {
    setIsVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem('fisioflow_onboarding_completed');
    setIsCompleted(false);
    setIsVisible(true);
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem('fisioflow_onboarding_completed', 'true');
    setIsCompleted(true);
    setIsVisible(false);
  }, []);

  return {
    isCompleted,
    isVisible,
    start,
    dismiss,
    reset,
    complete,
  };
}

export const useOnboardingContext = () => {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
};
