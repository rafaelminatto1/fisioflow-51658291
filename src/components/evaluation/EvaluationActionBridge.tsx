import React from "react";
import { 
    Activity, 
    ChevronRight, 
    AlertCircle,
    Info,
    ShieldAlert,
    BookOpenCheck,
    Dumbbell,
    ExternalLink,
    Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ActiveSuggestion } from "@/hooks/useActionBridge";
import { cn } from "@/lib/utils";

interface EvaluationActionBridgeProps {
    suggestions: ActiveSuggestion[];
    onProtocolSelect?: (protocolId: string) => void;
    onPrescribeProtocol?: (protocolId: string) => void;
}

export function EvaluationActionBridge({ suggestions, onProtocolSelect, onPrescribeProtocol }: EvaluationActionBridgeProps) {
    if (suggestions.length === 0) return null;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Action Bridge — IA Clínica
                </h3>
            </div>

            <div className="space-y-3">
                {suggestions.map((active) => (
                    <Card key={active.ruleId} className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden border-l-4 border-l-primary">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-primary">{active.ruleName}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-600 leading-relaxed italic">
                                        "{active.reasoning}"
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-[8px] bg-white font-bold text-primary border-primary/30 uppercase tracking-tighter shrink-0">
                                    Sugestão IA
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {active.suggestions.map((s, idx) => (
                                    <div 
                                        key={idx}
                                        className={cn(
                                            "flex items-center justify-between p-2 rounded-lg border transition-all",
                                            s.type === 'protocol' ? "bg-white border-sky-100 hover:border-sky-300 cursor-pointer" : 
                                            s.type === 'precaution' ? "bg-amber-50/50 border-amber-100" :
                                            "bg-white border-slate-100"
                                        )}
                                        onClick={() => s.id && s.type === 'protocol' && onProtocolSelect?.(s.id)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={cn(
                                                "h-7 w-7 rounded flex items-center justify-center shrink-0",
                                                s.type === 'protocol' ? "bg-sky-50 text-sky-600" :
                                                s.type === 'precaution' ? "bg-amber-50 text-amber-600" :
                                                s.type === 'alert' ? "bg-rose-50 text-rose-600" :
                                                "bg-slate-50 text-slate-600"
                                            )}>
                                                {s.type === 'protocol' && <BookOpenCheck className="h-4 w-4" />}
                                                {s.type === 'precaution' && <ShieldAlert className="h-4 w-4" />}
                                                {s.type === 'alert' && <AlertCircle className="h-4 w-4" />}
                                                {s.type === 'exercise' && <Dumbbell className="h-4 w-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[11px] font-bold text-slate-800 truncate">{s.title}</p>
                                                    {s.priority === 'high' && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate leading-tight">{s.content}</p>
                                            </div>
                                        </div>
                                        {s.type === 'protocol' && (
                                            <div className="flex items-center gap-2">
                                                {onPrescribeProtocol && (
                                                    <Badge 
                                                        variant="outline" 
                                                        className="h-6 px-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            s.id && onPrescribeProtocol(s.id);
                                                        }}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" /> Prescrever
                                                    </Badge>
                                                )}
                                                <ChevronRight className="h-3 w-3 text-sky-400 shrink-0" />
                                            </div>
                                        )}
                                        {s.type === 'exercise' && (
                                            <ExternalLink className="h-3 w-3 text-slate-300 shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="px-1 py-2 border-t border-slate-100 flex items-start gap-2">
                <Info className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[9px] text-slate-400 leading-tight">
                    Estas sugestões são automáticas e baseadas em diretrizes clínicas. A decisão final é sempre do profissional.
                </p>
            </div>
        </div>
    );
}
