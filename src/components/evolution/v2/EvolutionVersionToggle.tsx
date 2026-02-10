/**
 * EvolutionVersionToggle - Improved V2
 *
 * Enhanced version toggle with better UX,
 * smooth animations, and professional visual design.
 */
import React from 'react';
import { FileText, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import type { EvolutionVersion } from './types';

interface EvolutionVersionToggleProps {
  version: EvolutionVersion;
  onToggle: (version: EvolutionVersion) => void;
  className?: string;
}

export const EvolutionVersionToggle: React.FC<EvolutionVersionToggleProps> = ({
  version,
  onToggle,
  className,
}) => {
  return (
    <TooltipProvider>
      <div className={cn(
        'relative inline-flex items-center gap-0.5 p-1 rounded-xl',
        'bg-gradient-to-r from-muted/80 to-muted border border-border/50 shadow-sm',
        className
      )}>
        {/* Active indicator */}
        <div
          className={cn(
            'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-background shadow-sm transition-all duration-300 ease-out',
            version === 'v1-soap' ? 'left-1' : 'left-1/2'
          )}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle('v1-soap')}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
                'hover:text-foreground',
                version === 'v1-soap'
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <ClipboardList className="h-4 w-4" />
              <span>SOAP</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Formato SOAP tradicional (4 campos)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle('v2-texto')}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
                'hover:text-foreground',
                version === 'v2-texto'
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <FileText className="h-4 w-4" />
              <span>Texto Livre</span>
              {/* V2 badge */}
              {version === 'v2-texto' && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-primary text-white text-[9px] font-bold">
                  V2
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Formato texto livre estilo Notion (blocos)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
