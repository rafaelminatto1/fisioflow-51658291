import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, TrendingUp, TrendingDown, Target, Zap, Info } from 'lucide-react';
import { useAI } from '@/integrations/firebase/ai';
import { motion, AnimatePresence } from 'framer-motion';

interface ClinicAIInsightsProps {
  data: {
    patients: { total: number; active: number; newThisMonth: number };
    appointments: { total: number; completed: number; cancelled: number; noShow: number };
    financial: { revenue: number; growth: number };
  };
}

export const ClinicAIInsights: React.FC<ClinicAIInsightsProps> = ({ data }) => {
  const { generate } = useAI();
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateClinicInsights = async () => {
    setLoading(true);
    try {
      const prompt = `
        Aja como um CEO de uma rede de clínicas de fisioterapia. Analise o desempenho mensal da unidade:
        - Pacientes: ${data.patients.total} totais, ${data.patients.active} ativos, ${data.patients.newThisMonth} novos.
        - Agenda: ${data.appointments.total} atendimentos, ${data.appointments.completed} concluídos, ${data.appointments.cancelled} cancelados, ${data.appointments.noShow} faltas.
        - Financeiro: R$ ${data.financial.revenue} de faturamento, ${data.financial.growth}% de crescimento.
        
        Forneça um "Resumo Executivo" em 3 parágrafos curtos:
        1. Desempenho geral.
        2. Alerta crítico (se houver, como taxa de falta ou queda de novos pacientes).
        3. Estratégia recomendada para o próximo mês.
        
        Use um tom profissional, direto e ambicioso. Responda em Português Brasileiro.
      `;

      const result = await generate(prompt, {
        userId: 'admin-manager',
        feature: 'clinical_analysis' as any,
      });

      setInsights(result.content);
    } catch (error) {
      console.error('Erro ao gerar insights da clínica:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-md overflow-hidden relative">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Zap className="h-32 w-32 text-primary" />
      </div>
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight text-foreground">Clinsight IA Executive</CardTitle>
              <CardDescription className="text-xs">Análise de performance macro da sua clínica</CardDescription>
            </div>
          </div>
          {!insights && !loading && (
            <Button 
              size="sm" 
              onClick={generateClinicInsights}
              className="rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90"
            >
              Gerar Relatório Estratégico
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center space-y-4"
            >
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground animate-pulse">Cruzando dados financeiros e clínicos para seu relatório...</p>
            </motion.div>
          ) : insights ? (
            <motion.div 
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-sm dark:prose-invert max-w-none"
            >
              <div className="bg-background/50 backdrop-blur-sm p-6 rounded-2xl border border-primary/10 shadow-inner leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {insights}
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateClinicInsights}
                  className="text-xs text-primary hover:bg-primary/10 rounded-lg"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Atualizar Análise
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="py-8 text-center bg-muted/20 rounded-2xl border border-dashed border-muted">
              <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">Clique no botão acima para analisar o desempenho do mês.</p>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
