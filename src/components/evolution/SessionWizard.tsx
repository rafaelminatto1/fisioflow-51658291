import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  label: string;
  completed: boolean;
  optional?: boolean;
}

interface SessionWizardProps {
  steps: WizardStep[];
  currentStep: string;
  onStepClick: (stepId: string) => void;
}

export const SessionWizard: React.FC<SessionWizardProps> = ({
  steps,
  currentStep,
  onStepClick
}) => {
  return (
    <nav aria-label="Progresso do atendimento">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = step.completed;
          
          return (
            <li
              key={step.id}
              className={cn(
                "relative flex-1",
                index !== steps.length - 1 && "pr-8"
              )}
            >
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-1/2 w-full h-0.5 transition-colors",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step button */}
              <button
                onClick={() => onStepClick(step.id)}
                className={cn(
                  "relative flex flex-col items-center group w-full",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-2"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted && "bg-primary border-primary",
                    isCurrent && !isCompleted && "border-primary bg-background",
                    !isCurrent && !isCompleted && "border-muted bg-background"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <Circle
                      className={cn(
                        "h-5 w-5",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium transition-colors text-center",
                    isCurrent && "text-foreground",
                    !isCurrent && isCompleted && "text-muted-foreground",
                    !isCurrent && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.label}
                  {step.optional && (
                    <span className="block text-[10px] text-muted-foreground">(opcional)</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
