import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Trophy, Activity, Brain, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAI } from '@/integrations/firebase/ai';
import { motion } from 'framer-motion';
import { logger } from '@/lib/errors/logger';

interface ExerciseCoachAIProps {
  sessionData: {
    exerciseType: string;
    totalRepetitions: number;
    averageForm: number;
    caloriesBurned: number;
  };
}

export const ExerciseCoachAI: React.FC<ExerciseCoachAIProps> = ({ sessionData }) => {
  const { generate } = useAI();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getAIFeedback = async () => {
    setLoading(true);
    try {
      const prompt = `
        Aja como um Personal Trainer e Fisioterapeuta de elite. Analise a sessão de exercícios:
        - Exercício: ${sessionData.exerciseType}
        - Repetições: ${sessionData.totalRepetitions}
        - Score de Forma (Qualidade): ${sessionData.averageForm}%
        - Calorias: ${sessionData.caloriesBurned}
        
        Forneça um feedback motivador e técnico (máximo 3 frases).
        Se a forma for < 70%, foque em segurança. Se for > 90%, desafie o paciente.
        Responda em Português Brasileiro.
      `;

      const result = await generate(prompt, {
        userId: 'patient-coach',
        feature: 'clinical_analysis' as any,
      });

      setFeedback(result.content);
    } catch (error) {
      logger.error('Erro no Coach IA', error, 'ExerciseCoachAI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary text-lg">
          <Sparkles className="h-5 w-5 animate-pulse" />
          Clinsight AI Coach
        </CardTitle>
        <CardDescription>Análise instantânea da sua execução</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!feedback && !loading ? (
          <Button onClick={getAIFeedback} className="w-full rounded-xl font-bold bg-primary text-primary-foreground shadow-sm">
            Ver Análise do Treino
          </Button>
        ) : loading ? (
          <div className="flex flex-col items-center py-4 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">O Gemini está analisando sua biomecânica...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-background border border-primary/10 italic text-foreground/90 leading-relaxed text-sm"
          >
            "{feedback}"
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-background border flex flex-col items-center text-center">
            <Trophy className="h-4 w-4 text-yellow-500 mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Qualidade</span>
            <span className="text-sm font-black">{sessionData.averageForm}%</span>
          </div>
          <div className="p-3 rounded-xl bg-background border flex flex-col items-center text-center">
            <Activity className="h-4 w-4 text-emerald-500 mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Repetições</span>
            <span className="text-sm font-black">{sessionData.totalRepetitions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
