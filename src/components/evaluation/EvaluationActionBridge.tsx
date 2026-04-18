import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Activity, 
    ChevronRight, 
    AlertCircle,
    Info,
    ShieldAlert,
    BookOpenCheck,
    Dumbbell,
    ExternalLink,
    Plus,
    Sparkles,
    Lightbulb,
    ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActiveSuggestion } from "@/hooks/useActionBridge";
import { cn } from "@/lib/utils";

interface EvaluationActionBridgeProps {
    suggestions: ActiveSuggestion[];
    onProtocolSelect?: (protocolId: string) => void;
    onPrescribeProtocol?: (protocolId: string) => void;
    onPrescribeExercise?: (exerciseId: string) => void;
}

export function EvaluationActionBridge({ 
    suggestions, 
    onProtocolSelect, 
    onPrescribeProtocol,
    onPrescribeExercise 
}: EvaluationActionBridgeProps) {
    if (suggestions.length === 0) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            Assistente de Decisão Clínica
                        </h3>
                        <p className="text-[10px] text-slate-500">Inteligência FisioFlow baseada em achados</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">
                    {suggestions.length} insights
                </Badge>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {suggestions.map((active, idx) => (
                        <motion.div
                            key={active.ruleId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className="border-l-4 border-l-blue-500 bg-white dark:bg-slate-900 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{active.ruleName}</span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed italic flex gap-1 items-start">
                                                    <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                                    "{active.reasoning}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {active.suggestions.map((s, sIdx) => (
                                            <div 
                                                key={sIdx}
                                                className={cn(
                                                    "group flex items-center justify-between p-3 rounded-xl border transition-all",
                                                    s.type === 'protocol' ? "bg-blue-50/30 border-blue-100 hover:border-blue-300" : 
                                                    s.type === 'precaution' ? "bg-amber-50/30 border-amber-100" :
                                                    s.type === 'alert' ? "bg-rose-50/30 border-rose-100" :
                                                    "bg-slate-50/30 border-slate-100"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                                        s.type === 'protocol' ? "bg-blue-500 text-white" :
                                                        s.type === 'precaution' ? "bg-amber-500 text-white" :
                                                        s.type === 'alert' ? "bg-rose-500 text-white" :
                                                        "bg-slate-500 text-white"
                                                    )}>
                                                        {s.type === 'protocol' && <BookOpenCheck className="h-4 w-4" />}
                                                        {s.type === 'precaution' && <ShieldAlert className="h-4 w-4" />}
                                                        {s.type === 'alert' && <AlertCircle className="h-4 w-4" />}
                                                        {s.type === 'exercise' && <Dumbbell className="h-4 w-4" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{s.title}</p>
                                                            {s.priority === 'high' && (
                                                                <Badge variant="destructive" className="h-3 px-1 text-[8px] animate-pulse">URGENTE</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 truncate leading-tight">{s.content}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {s.id && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            className="h-7 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (s.type === 'protocol') {
                                                                    onPrescribeProtocol?.(s.id!);
                                                                } else if (s.type === 'exercise') {
                                                                    onPrescribeExercise?.(s.id!);
                                                                }
                                                                onProtocolSelect?.(s.id!);
                                                            }}
                                                        >
                                                            {s.type === 'protocol' ? 'Prescrever' : 'Adicionar'}
                                                            <ArrowRight className="h-3 w-3 ml-1" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <Info className="h-3 w-3 text-slate-500" />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Nota de Responsabilidade</span>
                    As sugestões da IA são baseadas em evidências científicas e diretrizes de prática clínica, mas não substituem o julgamento clínico do fisioterapeuta.
                </p>
            </div>
        </div>
    );
}
