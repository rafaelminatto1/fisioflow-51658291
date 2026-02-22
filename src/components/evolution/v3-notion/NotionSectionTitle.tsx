import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NotionSectionTitleProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
  isComplete?: boolean;
  isRequired?: boolean;
  id?: string; // For focus management
}

export const NotionSectionTitle: React.FC<NotionSectionTitleProps> = ({
  icon,
  title,
  subtitle,
  badge,
  className,
  isComplete = false,
  isRequired = false,
  id,
}) => {
  const [showCompletionCheck, setShowCompletionCheck] = useState(false);

  // Show completion checkmark after delay when marked complete
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setShowCompletionCheck(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  return (
    <div
      id={id}
      className={cn(
        'flex items-center gap-2 mb-2 group relative',
        isComplete && 'opacity-60', // Fade completed sections slightly
        isRequired && 'animate-pulse-soft', // Pulsing border for required fields
        className
      )}
      tabIndex={-1} // Skip in tab navigation unless interactive
    >
      {/* Completion checkmark with animation */}
      {isComplete && showCompletionCheck && (
        <span
          className="absolute -right-6 top-1 h-5 w-5 text-green-500 animate-check-in"
          aria-label="Seção completada"
          role="status"
        >
          ✓
        </span>
      )}

      {/* Required field indicator */}
      {isRequired && (
        <span
          className="absolute -left-1 -top-1 h-4 w-4 text-amber-500 animate-required-pulse"
          aria-label="Campo obrigatório"
          title="Campo obrigatório"
        >
          !
        </span>
      )}

      <span
        className={cn(
          'flex items-center justify-center h-6 w-6 rounded-md bg-muted/10 text-muted-foreground/70 flex-shrink-0 transition-all duration-300',
          isComplete && 'scale-90'
        )}
      >
        {icon}
      </span>
      <h2 className="text-base font-semibold text-slate-800 tracking-tight">{title}</h2>
      {subtitle && (
        <span className="text-xs text-slate-500 font-normal ml-2">{subtitle}</span>
      )}
      {badge && badge}
    </div>
  );
};
