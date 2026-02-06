import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { useAI, AIFeatureCategory } from '@/integrations/firebase/ai';
import { DashboardMetrics } from '@/hooks/useDashboardMetrics';
import { motion, AnimatePresence } from 'framer-motion';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface AIInsightsWidgetProps {
  metrics: DashboardMetrics | undefined;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ metrics }) => {
  const { generate } = useAI();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    if (!metrics) return;
    
    setLoading(true);
    try {
      const prompt = `
        Analise as seguintes métricas de uma clínica de fisioterapia e forneça 3 insights acionáveis e curtos (máximo 2 frases cada).
        Métricas:
        - Total de Pacientes: ${metrics.totalPacientes}
        - Pacientes Ativos (30 dias): ${metrics.pacientesAtivos}
        - Pacientes Novos este mês: ${metrics.pacientesNovos}
        - Taxa de Ocupação: ${metrics.taxaOcupacao}%
        - Taxa de No-Show: ${metrics.taxaNoShow}%
        - Receita Mensal: R$ ${metrics.receitaMensal}
        - Crescimento Mensal: ${metrics.crescimentoMensal}%
        - Pacientes em Risco (sem consulta > 30 dias): ${metrics.pacientesEmRisco}

        Formato de saída:
        Markdown com ícones representativos para cada insight.
        Foque em: Retenção de pacientes, Otimização de agenda e Saúde financeira.
      `;

      const result = await generate(prompt, {
        userId: 'system-dashboard', // Idealmente usar ID do usuário logado
        feature: AIFeatureCategory.QUICK_SUGGESTIONS,
      });

      setInsight(result.content);
    } catch (error) {
      logger.error('Erro ao gerar insights', error, 'AIInsightsWidget');
      setInsight("Não foi possível gerar insights no momento. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (metrics && !insight && !loading) {
      generateInsights();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics]);

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles className="h-24 w-24 text-primary" />
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5 animate-pulse" />
          Clinsight AI Insights
        </CardTitle>
        <CardDescription>
          Análise inteligente baseada nos dados atuais da sua clínica
        </CardDescription>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 py-4"
            >
              <div className="h-4 w-3/4 bg-primary/10 animate-pulse rounded" />
              <div className="h-4 w-1/2 bg-primary/10 animate-pulse rounded" />
              <div className="h-4 w-2/3 bg-primary/10 animate-pulse rounded" />
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed"
            >
              {insight ? (
                <div className="space-y-4">
                  <div className="whitespace-pre-wrap">
                    {insight}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={generateInsights}
                    className="mt-2 text-xs h-8 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Atualizar Insights
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 text-center">
                  <Lightbulb className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para analisar seus dados</p>
                  <Button size="sm" onClick={generateInsights} className="mt-4">
                    Gerar Análise
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
