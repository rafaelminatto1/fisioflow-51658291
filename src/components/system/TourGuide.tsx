import React from 'react';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const TourGuide: React.FC = () => {
  const { isActive, currentStep, steps, nextStep, prevStep, endTour } = useTour();

  if (!isActive) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Overlay simplificado */}
        <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={endTour} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="absolute z-[101] w-80 bg-card border shadow-2xl rounded-2xl p-5 pointer-events-auto"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            // No futuro, podemos usar getBoundingClientRect para posicionar próximo ao alvo
          }}
        >
          <button 
            onClick={endTour}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <h4 className="font-bold text-sm uppercase tracking-wider text-primary">
                FisioTour ({currentStep + 1}/{steps.length})
              </h4>
            </div>
            
            <h3 className="font-bold text-lg leading-tight">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.content}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={prevStep} 
                disabled={currentStep === 0}
                className="gap-1 h-8 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
                Anterior
              </Button>

              <Button 
                variant="default" 
                size="sm" 
                onClick={nextStep}
                className="gap-1 h-8 text-xs bg-primary hover:bg-primary/90 shadow-md"
              >
                {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
                {currentStep < steps.length - 1 && <ChevronRight className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
