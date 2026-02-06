import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { Progress } from '@/components/ui/progress';

    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    User,
    Eye,
    Brain,
    ClipboardList,
    Sparkles,
    Copy,
    FileText,
    CheckCircle2,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

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
    },
    {
        key: 'objective',
        label: 'Objetivo',
        shortLabel: 'O',
        icon: Eye,
        placeholder: 'Achados do exame físico, amplitude de movimento, força, testes especiais...',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
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
    },
];

interface SOAPAccordionFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    sectionKey: string;
}

const SOAPAccordionField = React.memo(({
    value,
    onChange,
    placeholder,
    disabled,
    sectionKey
}: SOAPAccordionFieldProps) => {
    const [localValue, setLocalValue] = useState(value);
    const lastSentValue = React.useRef(value);
    const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (value !== localValue && value !== lastSentValue.current && !debounceTimer.current) {
            setLocalValue(value || '');
            lastSentValue.current = value || '';
        }
    }, [value]);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            if (newValue !== lastSentValue.current) {
                lastSentValue.current = newValue;
                onChange(newValue);
            }
        }, 1000); // Aumentado para 1000ms para melhor performance ao digitar
    }, [onChange]);

    return (
        <SmartTextarea
            id={sectionKey}
            value={localValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
                'min-h-[120px] sm:min-h-[150px] resize-none',
                'focus:ring-2 focus:ring-primary/20'
            )}
        />
    );
});

SOAPAccordionField.displayName = 'SOAPAccordionField';

interface SOAPAccordionProps {
    data: SOAPData;
    onChange: (data: SOAPData) => void;
    onAISuggest?: (section: keyof SOAPData) => void;
    onCopyLast?: (section: keyof SOAPData) => void;
    disabled?: boolean;
    className?: string;
}

export const SOAPAccordion: React.FC<SOAPAccordionProps> = ({
    data,
    onChange,
    onAISuggest,
    onCopyLast,
    disabled = false,
    className,
}) => {
    const [expandedSections, setExpandedSections] = useState<string[]>(['subjective']);

    const handleFieldChange = React.useCallback((key: keyof SOAPData, value: string) => {
        onChange({ ...data, [key]: value });
    }, [data, onChange]);

    const getWordCount = (text: string): number => {
        return text.split(/\s+/).filter(w => w.length > 0).length;
    };

    const getCompletionPercentage = (): number => {
        const completed = SOAP_SECTIONS.filter(
            section => getWordCount(data[section.key]) >= 10
        ).length;
        return (completed / SOAP_SECTIONS.length) * 100;
    };

    const getTotalWords = (): number => {
        return SOAP_SECTIONS.reduce((sum, section) => sum + getWordCount(data[section.key]), 0);
    };

    const completionPercentage = getCompletionPercentage();

    return (
        <TooltipProvider>
            <Card className={cn('border-border/50 shadow-sm', className)}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <FileText className="h-5 w-5 text-primary" />
                            Evolução SOAP
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={completionPercentage === 100 ? 'default' : 'secondary'}
                                className="text-xs"
                            >
                                {Math.round(completionPercentage)}% completo
                            </Badge>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                {getTotalWords()} palavras
                            </span>
                        </div>
                    </div>
                    <Progress value={completionPercentage} className="h-1.5 mt-2" />
                </CardHeader>

                <CardContent className="pt-0">
                    <Accordion
                        type="multiple"
                        value={expandedSections}
                        onValueChange={setExpandedSections}
                        className="space-y-2"
                    >
                        {SOAP_SECTIONS.map((section) => {
                            const Icon = section.icon;
                            const wordCount = getWordCount(data[section.key]);
                            const isComplete = wordCount >= 10;
                            const isExpanded = expandedSections.includes(section.key);

                            return (
                                <AccordionItem
                                    key={section.key}
                                    value={section.key}
                                    className={cn(
                                        'rounded-lg border transition-all overflow-hidden',
                                        section.borderColor,
                                        isExpanded && section.bgColor
                                    )}
                                >
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={cn(
                                                'w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm',
                                                section.bgColor,
                                                section.color
                                            )}>
                                                {section.shortLabel}
                                            </div>
                                            <span className="font-medium text-sm sm:text-base">{section.label}</span>
                                            {isComplete && (
                                                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto mr-2" />
                                            )}
                                            <Badge variant="outline" className="text-[10px] ml-auto mr-2">
                                                {wordCount} palavras
                                            </Badge>
                                        </div>
                                    </AccordionTrigger>

                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-3">
                                            {/* Action buttons */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {onAISuggest && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onAISuggest(section.key)}
                                                                disabled={disabled}
                                                                className="h-7 px-2 text-xs gap-1"
                                                            >
                                                                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                                                <span className="hidden sm:inline">Sugestão IA</span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Gerar sugestão com IA
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {onCopyLast && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onCopyLast(section.key)}
                                                                disabled={disabled}
                                                                className="h-7 px-2 text-xs gap-1"
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

                                            {/* Textarea */}
                                            <SOAPAccordionField
                                                sectionKey={section.key}
                                                value={data[section.key]}
                                                onChange={(val) => handleFieldChange(section.key, val)}
                                                placeholder={section.placeholder}
                                                disabled={disabled}
                                            />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
};

export default SOAPAccordion;
