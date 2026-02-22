/**
 * EvolutionVersionToggle - Supports V1 (SOAP), V2 (Texto Livre), V3 (Notion)
 */
import React from 'react';
import { FileText, ClipboardList, BookOpen } from 'lucide-react';
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

const versions: Array<{
  key: EvolutionVersion;
  label: string;
  badge?: string;
  icon: React.ElementType;
  tooltip: string;
}> = [
  { key: 'v1-soap', label: 'SOAP', icon: ClipboardList, tooltip: 'Formato SOAP tradicional (4 campos)' },
  { key: 'v2-texto', label: 'Texto Livre', badge: 'V2', icon: FileText, tooltip: 'Formato texto livre estilo blocos' },
  { key: 'v3-notion', label: 'Notion', badge: 'V3', icon: BookOpen, tooltip: 'Página contínua estilo Notion' },
];

export const EvolutionVersionToggle: React.FC<EvolutionVersionToggleProps> = ({
  version,
  onToggle,
  className,
}) => {
  const activeIndex = versions.findIndex((v) => v.key === version);
  const itemCount = versions.length;

  return (
    <TooltipProvider>
      <div className={cn(
        'relative inline-flex items-center gap-0.5 p-1 rounded-xl',
        'bg-gradient-to-r from-muted/80 to-muted border border-border/50 shadow-sm',
        className
      )}>
        {/* Active indicator */}
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-background shadow-sm transition-all duration-300 ease-out"
          style={{
            width: `calc(${100 / itemCount}% - 4px)`,
            left: `calc(${(activeIndex / itemCount) * 100}% + 4px)`,
          }}
        />

        {versions.map((v) => {
          const Icon = v.icon;
          const isActive = version === v.key;

          return (
            <Tooltip key={v.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(v.key)}
                  className={cn(
                    'relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
                    'hover:text-foreground',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{v.label}</span>
                  {v.badge && isActive && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-primary text-white text-[9px] font-bold">
                      {v.badge}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{v.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
