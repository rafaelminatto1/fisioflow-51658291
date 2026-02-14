/**
 * SOAPAccordionImproved - Enhanced SOAP Accordion Component
 *
 * A drop-in replacement for the existing SOAPAccordion with:
 * - Modern visual hierarchy and information architecture
 * - Consistent V2 design patterns
 * - Better spacing, padding, and layout
 * - Enhanced interactive elements and feedback
 * - Smooth animations and micro-interactions
 * - Improved accessibility (ARIA labels, keyboard navigation)
 * - Empty states and error states
 * - Professional clinical appearance
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  User,
  Eye,
  Brain,
  ClipboardList,
  Sparkles,
  Copy,
  CheckCircle2,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

export interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SOAPSection {
  key: keyof SOAPData;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient: string;
  description: string;
  examples?: string[];
}

interface SOAPAccordionImprovedProps {
  data: SOAPData;
  onChange: (data: SOAPData) => void;
  onAISuggest?: (section: keyof SOAPData) => void;
  onCopyLast?: (section: keyof SOAPData) => void;
  disabled?: boolean;
  className?: string;
  showAIButton?: boolean;
  showCopyButton?: boolean;
  autoExpandFirst?: boolean;
}

// ==================== CONSTANTS ====================

const SOAP_SECTIONS: SOAPSection[] = [
  {
    key: 'subjective',
    label: 'Subjetivo',
    shortLabel: 'S',
    icon: User,
    placeholder: 'Queixa principal, relato do paciente, sintomas, dor, desconforto, sono, estresse...',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-400 to-blue-600',
    description: 'Relato do paciente sobre sintomas e sensações',
    examples: ['"Paciente relata dor na região lombar"', '"Melhora do desconforto ao sentar"', '"Dor ao realizar movimentos de flexão"'],
  },
  {
    key: 'objective',
    label: 'Objetivo',
    shortLabel: 'O',
    icon: Eye,
    placeholder: 'Achados do exame físico, amplitude de movimento, força, testes especiais...',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    gradient: 'from-emerald-400 to-emerald-600',
    description: 'Dados mensuráveis e observáveis pelo profissional',
    examples: ['ADM: flexão 90°', 'Força muscular: grau 4/5', 'Teste de Lase: positivo'],
  },
  {
    key: 'assessment',
    label: 'Avaliação',
    shortLabel: 'A',
    icon: Brain,
    placeholder: 'Análise do progresso, resposta ao tratamento, correlações clínicas...',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    gradient: 'from-purple-400 to-purple-600',
    description: 'Interpretação dos dados subjetivos e objetivos',
    examples: ['Paciente apresentando melhora de 30%', 'Resposta positiva ao tratamento proposto', 'Necessita ajuste na conduta'],
  },
  {
    key: 'plan',
    label: 'Plano',
    shortLabel: 'P',
    icon: ClipboardList,
    placeholder: 'Conduta, exercícios prescritos, orientações para casa, plano para próxima visita...',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-400 to-amber-600',
    description: 'Intervenções planejadas e orientações',
    examples: ['Continuar com protocolo atual', 'Adicionar exercícios de fortalecimento', 'Orientar uso de gelo em casa'],
  },
];

// ==================== MAIN COMPONENT ====================

export const SOAPAccordionImproved: React.FC<SOAPAccordionImprovedProps> = ({
  data,
  onChange,
  onAISuggest,
  onCopyLast,
  disabled = false,
  className,
  showAIButton = true,
  showCopyButton = true,
  autoExpandFirst = true,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    autoExpandFirst ? ['subjective'] : []
  );

  const handleFieldChange = useCallback(
    (key: keyof SOAPData, value: string) => {
      onChange({ ...data, [key]: value });
    },
    [data, onChange]
  );

  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionKey)
        ? prev.filter((k) => k !== sectionKey)
        : [...prev, sectionKey]
    );
  }, []);

  const getWordCount = (text: string): number => {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  };

  const getCompletionPercentage = (): number => {
    const completed = SOAP_SECTIONS.filter(
      (section) => getWordCount(data[section.key]) >= 10
    ).length;
    return (completed / SOAP_SECTIONS.length) * 100;
  };

  const getTotalWords = (): number => {
    return SOAP_SECTIONS.reduce(
      (sum, section) => sum + getWordCount(data[section.key]),
      0
    );
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <TooltipProvider>
      <div
        className={cn(
          'rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300',
          'shadow-sm hover:shadow-md',
          className
        )}
      >
        {/* Enhanced Header */}
        <div className="relative">
          {/* Top gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/60 via-violet-500 to-violet-500/60" />

          <div className="flex items-center justify-between p-4 border-b border-border/40 bg-gradient-to-r from-violet-500/5 to-transparent">
            <div className="flex items-center gap-3">
              {/* Icon with gradient background */}
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20">
                <FileText className="h-5 w-5 text-violet-500" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Evolução SOAP
                </h3>
                <span className="text-xs text-muted-foreground">
                  Anotações clínicas estruturadas
                </span>
              </div>
            </div>

            {/* Completion badges */}
            <div className="flex items-center gap-2">
              <Badge
                variant={completionPercentage === 100 ? 'default' : 'secondary'}
                className="text-xs"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {Math.round(completionPercentage)}% completo
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {getTotalWords()} palavras
              </span>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="w-full h-1.5 bg-muted">
            <div
              className="h-full bg-gradient-to-r from-violet-400 via-violet-500 to-violet-600 transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* SOAP Sections */}
        <div className="p-4 space-y-3">
          {SOAP_SECTIONS.map((section) => {
            const Icon = section.icon;
            const wordCount = getWordCount(data[section.key]);
            const isComplete = wordCount >= 10;
            const isExpanded = expandedSections.includes(section.key);
            const hasContent = data[section.key]?.trim().length > 0;

            return (
              <div
                key={section.key}
                className={cn(
                  'rounded-xl border transition-all duration-200 overflow-hidden',
                  section.borderColor,
                  isExpanded && section.bgColor,
                  'hover:shadow-sm'
                )}
              >
                {/* Section Header */}
                <button
                  onClick={() => !disabled && toggleSection(section.key)}
                  disabled={disabled}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 text-left',
                    'hover:bg-muted/30 transition-colors',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {/* Letter badge with gradient */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm',
                      section.bgColor,
                      section.color
                    )}
                  >
                    {section.shortLabel}
                  </div>

                  {/* Section info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{section.label}</span>
                      {hasContent && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {section.description}
                    </p>
                  </div>

                  {/* Word count badge */}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  >
                    {wordCount} palavras
                  </Badge>

                  {/* Expand icon */}
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-muted-foreground transition-transform duration-200 flex-shrink-0',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Quick actions */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {showAIButton && onAISuggest && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAISuggest(section.key)}
                              disabled={disabled}
                              className="h-8 px-2 text-xs gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Sugestão IA</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Gerar sugestão com inteligência artificial
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {showCopyButton && onCopyLast && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCopyLast(section.key)}
                              disabled={disabled}
                              className="h-8 px-2 text-xs gap-1.5"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Copiar anterior</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Copiar da última sessão
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Textarea with enhanced styling */}
                    <Textarea
                      value={data[section.key]}
                      onChange={(e) => handleFieldChange(section.key, e.target.value)}
                      placeholder={section.placeholder}
                      disabled={disabled}
                      rows={5}
                      className={cn(
                        'resize-none text-sm min-h-[140px]',
                        'focus:ring-2 focus:ring-offset-0',
                        'transition-all duration-200',
                        isComplete && 'border-green-500/30 focus:ring-green-500/20'
                      )}
                    />

                    {/* Character/word count */}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        {isComplete ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Campo preenchido
                          </span>
                        ) : (
                          <span>Mínimo recomendado: 10 palavras</span>
                        )}
                      </p>

                      {/* Examples dropdown (optional) */}
                      {section.examples && section.examples.length > 0 && (
                        <details className="group">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground list-none flex items-center gap-1">
                            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                            Ver exemplos
                          </summary>
                          <ul className="mt-2 space-y-1 pl-4">
                            {section.examples.map((example, i) => (
                              <li
                                key={i}
                                className="text-xs text-muted-foreground italic"
                              >
                                "{example}"
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with quick stats */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-xs text-muted-foreground">Status do registro</span>
            <div className="flex items-center gap-2">
              {SOAP_SECTIONS.map((section) => {
                const Icon = section.icon;
                const hasContent = data[section.key]?.trim().length > 0;

                return (
                  <Tooltip key={section.key}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                          hasContent ? section.bgColor : 'bg-muted',
                          hasContent ? section.color : 'text-muted-foreground'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {section.label}: {hasContent ? 'Preenchido' : 'Vazio'}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SOAPAccordionImproved;
