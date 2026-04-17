import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, XCircle } from 'lucide-react';
import { useActionBridge } from '@/hooks/useActionBridge';
import { TemplateField } from '@/components/evaluation';
import { ClinicalInsightCard } from './ClinicalInsightCard';

interface ClinicalInsightsPanelProps {
    allFields: TemplateField[];
    fieldValues: Record<string, unknown>;
    onAcceptSuggestion: (suggestionId: string, type: string, data: any) => void;
}

export const ClinicalInsightsPanel: React.FC<ClinicalInsightsPanelProps> = ({
    allFields,
    fieldValues,
    onAcceptSuggestion
}) => {
    const { suggestions, hasRedFlag } = useActionBridge(allFields, fieldValues);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    const filteredSuggestions = suggestions.filter(s => !dismissedIds.includes(s.ruleId));

    if (filteredSuggestions.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Clinical Insights
                        </h3>
                        <p className="text-[10px] text-slate-500">
                            Sugestões baseadas em evidências
                        </p>
                    </div>
                </div>
                
                {hasRedFlag && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                        ALERTA DE SEGURANÇA
                    </span>
                )}
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredSuggestions.map((rule) => (
                        <div key={rule.ruleId} className="space-y-2">
                            {rule.suggestions.map((sug, idx) => (
                                <ClinicalInsightCard
                                    key={`${rule.ruleId}-${idx}`}
                                    type={sug.type}
                                    title={sug.title}
                                    content={sug.content}
                                    priority={sug.priority}
                                    reasoning={rule.reasoning}
                                    onAccept={() => onAcceptSuggestion(rule.ruleId, sug.type, sug)}
                                    onDismiss={() => setDismissedIds(prev => [...prev, rule.ruleId])}
                                />
                            ))}
                        </div>
                    ))}
                </AnimatePresence>
            </div>

            {dismissedIds.length > 0 && (
                <button 
                    onClick={() => setDismissedIds([])}
                    className="mx-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500"
                >
                    <XCircle size={12} />
                    Restaurar sugestões ignoradas ({dismissedIds.length})
                </button>
            )}
        </div>
    );
};
