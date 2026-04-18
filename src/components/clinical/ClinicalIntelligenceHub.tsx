import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronRight, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb,
  ArrowRight,
  BookOpen,
  ClipboardList,
  ChevronDown,
  Info
} from 'lucide-react';
import { clinicalReasoningRules, ActionRule } from '../../data/clinicalReasoningRules';
import { protocolDictionary } from '../../data/protocolDictionary';
import { exerciseDictionary } from '../../data/exerciseDictionary';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ClinicalIntelligenceHubProps {
  evaluationData: Record<string, any>;
  onApplyProtocol?: (protocolId: string) => void;
  onApplyExercise?: (exerciseId: string) => void;
}

export const ClinicalIntelligenceHub: React.FC<ClinicalIntelligenceHubProps> = ({ 
  evaluationData,
  onApplyProtocol,
  onApplyExercise
}) => {
  const [matches, setMatches] = useState<ActionRule[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const activeMatches = clinicalReasoningRules.filter(rule => {
      const { condition } = rule;
      
      return condition.fieldLabels.some(label => {
        const value = evaluationData[label];
        if (!value) return false;

        // Match exact value
        if (condition.matchValue && value === condition.matchValue) return true;

        // Match any in list
        if (condition.matchAny && condition.matchAny.includes(value)) return true;

        // Match range
        if (typeof value === 'number') {
          if (condition.minValue !== undefined && value < condition.minValue) return false;
          if (condition.maxValue !== undefined && value > condition.maxValue) return false;
          return true;
        }

        // Partial match for strings (common in clinical notes)
        if (typeof value === 'string' && condition.matchValue) {
            return value.toLowerCase().includes(condition.matchValue.toLowerCase());
        }

        return false;
      });
    });

    setMatches(activeMatches);
  }, [evaluationData]);

  if (matches.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Assistente de Inteligência Clínica
        </h3>
        <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-600 border-blue-200">
          {matches.length} Sugestões
        </Badge>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {matches.map((rule, index) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-md font-bold flex items-center gap-2">
                        {rule.name}
                        {rule.suggestions.some(s => s.priority === 'high') && (
                          <Badge variant="destructive" className="text-[10px] h-4 px-1">ALTA PRIORIDADE</Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">{rule.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === rule.id ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {rule.suggestions.map((suggestion, sIdx) => (
                      <Badge 
                        key={sIdx}
                        variant={suggestion.type === 'alert' ? 'destructive' : 'secondary'}
                        className="flex items-center gap-1 py-1"
                      >
                        {suggestion.type === 'protocol' && <ClipboardList className="w-3 h-3" />}
                        {suggestion.type === 'exercise' && <Activity className="w-3 h-3" />}
                        {suggestion.type === 'alert' && <AlertTriangle className="w-3 h-3" />}
                        {suggestion.type === 'precaution' && <Info className="w-3 h-3" />}
                        {suggestion.title}
                      </Badge>
                    ))}
                  </div>

                  <AnimatePresence>
                    {expandedId === rule.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" /> Raciocínio Clínico
                            </h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                              "{rule.reasoning}"
                            </p>
                          </div>

                          <div className="space-y-3">
                            {rule.suggestions.map((suggestion, sIdx) => (
                              <div 
                                key={sIdx}
                                className={`p-3 rounded-xl border-2 transition-all ${
                                  suggestion.priority === 'high' 
                                    ? 'border-red-100 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/20' 
                                    : 'border-blue-50 bg-blue-50/20 dark:border-blue-900/20 dark:bg-blue-950/10'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-bold text-sm flex items-center gap-2">
                                    {suggestion.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                    {suggestion.title}
                                  </h5>
                                  {suggestion.id && (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-7 text-xs gap-1"
                                      onClick={() => {
                                        if (suggestion.type === 'protocol' && onApplyProtocol) onApplyProtocol(suggestion.id!);
                                        if (suggestion.type === 'exercise' && onApplyExercise) onApplyExercise(suggestion.id!);
                                      }}
                                    >
                                      Aplicar <ArrowRight className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {suggestion.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
