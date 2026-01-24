/**
 * Onboarding Flow - First-time user experience
 *
 * Guided tour for new users to learn the FisioFlow platform
 *
 * @module components/onboarding
 */

import React, { useState, useCallback, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image?: React.ReactNode;
  action?: string;
  target?: string; // CSS selector for highlighting
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao FisioFlow',
    description: 'Seu sistema completo de gestão para fisioterapeutas. Vamos fazer um tour rápido?',
    action: 'Começar Tour',
  },
  {
    id: 'agenda',
    title: 'Gerencie sua Agenda',
    description: 'Visualize seus agendamentos, gerencie horários e configure lembretes automáticos.',
    target: '[data-tour="agenda"]',
    action: 'Próximo',
  },
  {
    id: 'prontuario',
    title: 'Prontuário Eletrônico',
    description: 'Registe evoluções, anexe arquivos e mantenha o histórico completo dos pacientes.',
    target: '[data-tour="prontuario"]',
    action: 'Próximo',
  },
  {
    id: 'exercicios',
    title: 'Biblioteca de Exercícios',
    description: 'Acesse centenas de exercícios com vídeos, crie planos personalizados.',
    target: '[data-tour="exercicios"]',
    action: 'Próximo',
  },
  {
    id: 'relatorios',
    title: 'Relatórios e Métricas',
    description: 'Acompanhe o desempenho da sua clínica com gráficos e relatórios detalhados.',
    target: '[data-tour="relatorios"]',
    action: 'Concluir',
  },
];

interface OnboardingFlowProps {
  steps?: OnboardingStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  className?: string;
}

export function OnboardingFlow({
  steps = DEFAULT_STEPS,
  onComplete,
  onSkip,
  showSkip = true,
  className,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);

  // Check if user already completed onboarding
  useEffect(() => {
    const completed = localStorage.getItem('fisioflow_onboarding_completed');
    if (completed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Handle step target highlighting
  useEffect(() => {
    const step = steps[currentStep];
    if (step?.target) {
      const targetElement = document.querySelector(step.target);
      if (targetElement) {
        setIsHighlighting(true);
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          targetElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          setIsHighlighting(false);
        }, 2000);
      }
    }
  }, [currentStep, steps]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem('fisioflow_onboarding_completed', 'true');
    setIsDismissed(true);
    onComplete?.();

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 50, 20]);
    }
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('fisioflow_onboarding_completed', 'true');
    setIsDismissed(true);
    onSkip?.();

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [onSkip]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  if (isDismissed) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-50 animate-in fade-in',
          'transition-opacity duration-300',
          className
        )}
        onClick={handleDismiss}
      />

      {/* Onboarding Card */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'bg-background rounded-t-3xl md:rounded-3xl shadow-2xl',
          'z-50',
          'animate-in slide-in-from-bottom md:slide-in-from-bottom-4',
          'max-w-lg w-full mx-auto md:mx-0',
          'safe-area-inset-bottom'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress Bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Indicator Dots */}
        <div className="flex justify-center gap-2 py-4 px-6">
          {steps.map((s, index) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentStep
                  ? 'w-8 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-muted'
              )}
              aria-label={`Ir para passo ${index + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {step.image && (
            <div className="mb-6 flex justify-center">
              {step.image}
            </div>
          )}

          <h2 className="text-2xl font-bold text-foreground mb-3">
            {step.title}
          </h2>

          <p className="text-muted-foreground text-base leading-relaxed mb-8">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className={cn(
                  'flex items-center gap-2',
                  'px-4 py-3 rounded-xl',
                  'text-foreground font-medium',
                  'hover:bg-muted transition-colors',
                  'touch-target'
                )}
              >
                <ChevronLeft className="w-5 h-5" />
                Voltar
              </button>
            )}

            <div className="flex-1" />

            <button
              onClick={handleNext}
              className={cn(
                'flex items-center gap-2',
                'px-6 py-3 rounded-xl',
                'bg-primary text-primary-foreground',
                'font-medium',
                'hover:shadow-lg hover:scale-105',
                'active:scale-95',
                'transition-all duration-200',
                'touch-target'
              )}
            >
              {step.action || 'Próximo'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Skip Button */}
          {showSkip && currentStep < steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular tour
            </button>
          )}
        </div>
      </div>
    </>
  );
}

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

/**
 * Auto-detects first-time users and shows onboarding
 */
export function OnboardingDetector() {
  const { isCompleted, start } = useOnboarding();

  useEffect(() => {
    if (!isCompleted) {
      // Delay slightly to let page load
      const timer = setTimeout(() => {
        start();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isCompleted, start]);

  return null;
}

/**
 * Mini tooltip-style onboarding for specific features
 */
interface FeatureTooltipProps {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  show: boolean;
  onDismiss: () => void;
}

export function FeatureTooltip({
  target,
  title,
  description,
  position = 'bottom',
  show,
  onDismiss,
}: FeatureTooltipProps) {
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show) {
      const element = document.querySelector(target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
        });

        // Highlight target
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');

        return () => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        };
      }
    }
  }, [target, show]);

  if (!show) return null;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  return (
    <div
      className={cn(
        'fixed z-50',
        'w-72 bg-background rounded-xl shadow-2xl border border-border',
        'p-4 animate-in fade-in zoom-in-95',
        'transition-all duration-200',
        positionClasses[position]
      )}
      style={{
        top: coords.top,
        left: coords.left,
      }}
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>

      <h4 className="font-semibold text-foreground mb-1 pr-6">
        {title}
      </h4>

      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/**
 * Context for onboarding state management
 */
interface OnboardingContextValue {
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

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { isCompleted, isVisible, start, dismiss, reset, complete } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <OnboardingContext.Provider
      value={{
        isCompleted,
        isVisible,
        start,
        dismiss,
        reset,
        complete,
        currentStep,
        setCurrentStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboardingContext = () => {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
};
