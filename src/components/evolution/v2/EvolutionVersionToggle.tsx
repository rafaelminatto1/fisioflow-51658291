import React from 'react';
import { FileText, ClipboardList, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
      <div className={cn('flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/40', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle('v1-soap')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                version === 'v1-soap'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>SOAP</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Formato SOAP tradicional (4 campos)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle('v2-texto')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                version === 'v2-texto'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Texto Livre</span>
              <Badge variant="secondary" className="text-[9px] h-4 px-1 leading-none">V2</Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Formato texto livre estilo Notion (blocos)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
