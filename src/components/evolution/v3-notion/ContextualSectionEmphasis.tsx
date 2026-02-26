/**
 * ContextualSectionEmphasis - Visual emphasis for sections based on completion status
 *
 * Features:
 * - Critical missing fields get animated borders
 * - Completed sections fade slightly to reduce noise
 * - Active sections get "zone active" indicator
 * - Emphasis level based on field importance
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export type EmphasisLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

interface SectionEmphasisConfig {
  id: string;
  isRequired: boolean;
  isFilled: boolean;
  importance: 'primary' | 'secondary' | 'optional';
  isActive?: boolean; // Currently being edited
}

interface EmphasizedSectionProps {
  config: SectionEmphasisConfig;
  children: React.ReactNode;
  className?: string;
}

const getEmphasisLevel = (config: SectionEmphasisConfig): EmphasisLevel => {
  if (config.isRequired && !config.isFilled) {
    return 'critical';
  }
  if (config.importance === 'primary' && !config.isFilled) {
    return 'high';
  }
  if (config.importance === 'secondary' && !config.isFilled) {
    return 'medium';
  }
  if (config.isFilled) {
    return 'low'; // Completed, minimal emphasis
  }
  return 'none';
};

const EMPHASIS_STYLES = {
  critical: {
    borderClass: 'border-transparent',
    glowClass: '',
    animationClass: '',
    icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
    bgClass: 'bg-transparent',
  },
  high: {
    borderClass: 'border-transparent',
    glowClass: '',
    animationClass: '',
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    bgClass: 'bg-transparent',
  },
  medium: {
    borderClass: 'border-transparent',
    glowClass: '',
    animationClass: '',
    icon: <AlertTriangle className="h-4 w-4 text-sky-500" />,
    bgClass: 'bg-transparent',
  },
  low: {
    borderClass: 'border-transparent',
    glowClass: '',
    animationClass: '',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    bgClass: 'bg-transparent',
  },
  none: {
    borderClass: 'border-transparent',
    glowClass: '',
    animationClass: '',
    icon: null,
    bgClass: 'bg-transparent',
  },
};

export const ContextualSectionEmphasis: React.FC<EmphasizedSectionProps> = ({
  config,
  children,
  className,
}) => {
  const emphasisLevel = useMemo(() => getEmphasisLevel(config), [config]);
  const styles = EMPHASIS_STYLES[emphasisLevel];

  return (
    <div
      className={cn(
        'emphasized-section',
        'transition-all duration-300 ease-out',
        styles.borderClass,
        styles.glowClass,
        styles.animationClass,
        styles.bgClass,
        'relative',
        className
      )}
    >
      {/* Status indicator */}
      {styles.icon && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md',
              'text-xs font-medium',
              emphasisLevel === 'critical' && 'bg-rose-500/10 text-rose-600',
              emphasisLevel === 'high' && 'bg-amber-500/10 text-amber-600',
              emphasisLevel === 'medium' && 'bg-sky-500/10 text-sky-600',
              emphasisLevel === 'low' && 'bg-emerald-500/10 text-emerald-600'
            )}
          >
            {styles.icon}
            <span>
              {emphasisLevel === 'critical' && 'Requerido'}
              {emphasisLevel === 'high' && 'Importante'}
              {emphasisLevel === 'medium' && 'Sugerido'}
              {emphasisLevel === 'low' && 'Completo'}
            </span>
          </div>
        </div>
      )}

      {/* Active zone indicator */}
      {config.isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary animate-pulse" />
      )}

      {/* Content */}
      <div className="pt-8 pr-8">{children}</div>
    </div>
  );
};

interface UseEmphasisConfigProps {
  data: {
    patientReport?: string;
    evolutionText?: string;
    painLevel?: number;
    procedures?: any[];
    exercises?: any[];
    measurements?: any[];
    observations?: string;
    homeCareExercises?: string;
    attachments?: any[];
  };
  activeSectionId?: string;
}

export const useSectionEmphasisConfigs = ({
  data,
  activeSectionId,
}: UseEmphasisConfigProps): Record<string, SectionEmphasisConfig> => {
  return useMemo(() => ({
    pain: {
      id: 'pain',
      isRequired: true,
      isFilled: data.painLevel !== undefined,
      importance: 'primary',
      isActive: activeSectionId === 'pain',
    },
    patientReport: {
      id: 'patientReport',
      isRequired: true,
      isFilled: !!data.patientReport?.trim(),
      importance: 'primary',
      isActive: activeSectionId === 'patientReport',
    },
    evolutionText: {
      id: 'evolutionText',
      isRequired: true,
      isFilled: !!data.evolutionText?.trim(),
      importance: 'primary',
      isActive: activeSectionId === 'evolutionText',
    },
    procedures: {
      id: 'procedures',
      isRequired: false,
      isFilled: !!(data.procedures && data.procedures.length > 0),
      importance: 'secondary',
      isActive: activeSectionId === 'procedures',
    },
    exercises: {
      id: 'exercises',
      isRequired: false,
      isFilled: !!(data.exercises && data.exercises.length > 0),
      importance: 'secondary',
      isActive: activeSectionId === 'exercises',
    },
    measurements: {
      id: 'measurements',
      isRequired: false,
      isFilled: !!(data.measurements && data.measurements.length > 0),
      importance: 'secondary',
      isActive: activeSectionId === 'measurements',
    },
    observations: {
      id: 'observations',
      isRequired: false,
      isFilled: !!data.observations?.trim() || !!data.homeCareExercises?.trim(),
      importance: 'optional',
      isActive: activeSectionId === 'observations',
    },
    attachments: {
      id: 'attachments',
      isRequired: false,
      isFilled: !!(data.attachments && data.attachments.length > 0),
      importance: 'optional',
      isActive: activeSectionId === 'attachments',
    },
  }), [data, activeSectionId]);
};

// Memoize for performance
export const MemoizedContextualSectionEmphasis = React.memo(ContextualSectionEmphasis);
MemoizedContextualSectionEmphasis.displayName = 'ContextualSectionEmphasis (Memoized)';
