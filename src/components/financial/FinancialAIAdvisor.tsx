import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useAI } from '@/integrations/firebase/ai';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { FinancialStats } from '@/hooks/useFinancial';

interface FinancialAIAdvisorProps {
  stats: FinancialStats | undefined;
}

export function FinancialAIAdvisor({ stats }: FinancialAIAdvisorProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { generate } = useAI();

  const generateFinancialAdvice = async () => {
    if (!stats) return;

    setIsGenerating(true);
    try {
      const prompt = `
        Aja como um consultor financeiro Pro para clínicas. Analise estes dados:
        - Receita: R$ ${stats.totalRevenue}
        - Pendente (Inadimplência): R$ ${stats.pendingPayments}
        - Crescimento: ${stats.monthlyGrowth}%
        - Ticket Médio: R$ ${stats.averageTicket}
        
        Forneça 2 dicas estratégicas e curtas (máximo 20 palavras cada) para aumentar o lucro.
        Responda em português brasileiro.
      `;
      const result = await generate(prompt, {
        userId: 'financial-module',
        feature: 'clinical_analysis' as unknown,
      });
      setAiSummary(result.content);
    } catch (error) {
      logger.error('Erro ao gerar insights', error, 'FinancialAIAdvisor');
      setAiSummary('Foco na redução de pendências para otimizar seu caixa!');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-none bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 shadow-premium-md overflow-hidden relative group rounded-2xl">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Sparkles className="h-32 w-32 text-emerald-600" />
      </div>
      <CardHeader className="pb-2 border-b border-emerald-100/50 dark:border-emerald-900/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-black tracking-tight text-lg">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>
              Clinsight AI
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 dark:text-emerald-500/40">
              Consultoria Estratégica
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isGenerating ? (
          <div className="space-y-3 py-2">
            <div className="h-3 w-3/4 bg-emerald-200/30 animate-pulse rounded-full" />
            <div className="h-3 w-1/2 bg-emerald-200/30 animate-pulse rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 leading-relaxed italic">
              "{aiSummary || 'Analise seu faturamento para receber dicas exclusivas de rentabilidade.'}"
            </p>
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateFinancialAdvice}
                disabled={!stats}
                className="text-[10px] font-black uppercase tracking-[0.2em] h-8 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Atualizar Insights
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
