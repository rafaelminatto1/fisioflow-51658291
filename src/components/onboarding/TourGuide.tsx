/**
 * Tour steps configuration for new users
 */

import React, { useState, useCallback, useEffect } from 'react';
import { TourProvider, useTour } from '@reactour/tour';
import { cn } from '@/lib/utils';
import { TourContext, useTourContext, tourSteps } from '@/hooks/onboarding/tourContext';


/**
 * Tour Provider component that wraps the application
 */
export function TourProviderWrapper({ children }: { children: React.ReactNode }) {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    const stored = localStorage.getItem('fisioflow-tour-completed');
    return stored === 'true';
  });

  // Auto-start tour for first-time users
  useEffect(() => {
    if (!hasSeenTour && !localStorage.getItem('fisioflow-tour-dismissed')) {
      // Delay slightly to let page load
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  const handleCloseTour = useCallback(() => {
    setIsTourOpen(false);
    localStorage.setItem('fisioflow-tour-completed', 'true');
    setHasSeenTour(true);
  }, []);

  const handleStartTour = useCallback(() => {
    setIsTourOpen(true);
  }, []);

  return (
    <TourContext.Provider
      value={{
        isTourOpen,
        setIsTourOpen,
        startTour: handleStartTour,
        closeTour: handleCloseTour,
        hasSeenTour,
        setHasSeenTour,
      }}
    >
      <TourProvider
        steps={tourSteps}
        isOpen={isTourOpen}
        onRequestClose={handleCloseTour}
        onClickMask={() => setIsTourOpen(false)}
        className="max-w-md"
        styles={{
          popover: (base) => ({
            ...base,
            borderRadius: '1rem',
            padding: '1.5rem',
          }),
          maskArea: (base) => ({
            ...base,
            rx: 10,
          }),
          badge: (base) => ({
            ...base,
            backgroundColor: 'hsl(var(--primary))',
            color: 'white',
          }),
          controls: (base) => ({
            ...base,
            marginTop: '1rem',
          }),
          close: (base) => ({
            ...base,
            marginTop: '0.5rem',
            marginRight: '0.5rem',
          }),
          dot: (base) => ({
            ...base,
            size: 2,
          }),
        }}
      >
        {children}
      </TourProvider>
    </TourContext.Provider>
  );
}

/**
 * Hook to use the tour context
 */

/**
 * Tour Guide component with custom controls
 */
export function TourGuide() {
  const { isOpen, currentStep, steps, _setIsOpen, _setSteps, setCurrentStep } = useTour();
  const { _hasSeenTour, setHasSeenTour, closeTour, startTour } = useTourContext();

  // Dismiss tour permanently
  const handleDismiss = useCallback(() => {
    localStorage.setItem('fisioflow-tour-dismissed', 'true');
    closeTour();
  }, [closeTour]);

  // Reset and restart tour
  const _handleRestart = useCallback(() => {
    localStorage.removeItem('fisioflow-tour-completed');
    localStorage.removeItem('fisioflow-tour-dismissed');
    setHasSeenTour(false);
    setCurrentStep(0);
    startTour();
  }, [setCurrentStep, setHasSeenTour, startTour]);

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating tour indicator */}
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 max-w-sm animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {currentStep + 1}
              </span>
              <h4 className="font-semibold text-sm">{step?.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{step?.content}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <button
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Não mostrar novamente
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => currentStep < steps.length - 1 ? setCurrentStep(currentStep + 1) : closeTour()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {currentStep < steps.length - 1 ? 'Próximo' : 'Concluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tour control button for settings/help menu
 */
export function TourControlButton({ className }: { className?: string }) {
  const { hasSeenTour, startTour } = useTourContext();

  return (
    <button
      onClick={startTour}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors',
        className
      )}
    >
      <span className="text-lg">🧭</span>
      <span>{hasSeenTour ? 'Reiniciar Tour' : 'Iniciar Tour'}</span>
    </button>
  );
}
