import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PatientSmartSummaryProps {
  patientId: string;
  patientName: string;
  condition: string;
  history: Array<{
    date: string;
    subjective?: string;
    objective?: string;
    exercises?: string[];
  }>;
  goals?: string[];
}

interface SummaryResult {
  summary: string;
  trends: Array<{
    metric: string;
    observation: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
  clinicalAdvice: string;
  keyRisks: string[];
}

export function PatientSmartSummary({ 
  patientId, 
  patientName, 
  condition, 
  history, 
  goals 
}: PatientSmartSummaryProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);

  const generateSummary = async () => {
    if (history.length === 0) {
      toast.error('Histórico insuficiente para gerar resumo');
      return;
    }

    setLoading(true);
    try {
      // Usar a URL do Cloud Functions
      const response = await fetch('https://southamerica-east1-fisioflow-migration.cloudfunctions.net/aiServiceHttp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'patientExecutiveSummary',
          patientName,
          condition,
          history: history.slice(0, 5), // Enviar as 5 mais recentes
          goals,
        }),
      });

      if (!response.ok) throw new Error('Falha na chamada da IA');
      
      const data = await response.json();
      if (data.success && data.data) {
        setResult(data.data);
        toast.success('Resumo gerado com sucesso!');
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('[SmartSummary] Error:', error);
      toast.error('Erro ao gerar resumo inteligente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-white to-primary/5 dark:from-slate-950 dark:to-primary/10 overflow-hidden relative">
      {/* Decoração superior */}
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Brain className="w-24 h-24 text-primary rotate-12" />
      </div>

      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Resumo Inteligente</CardTitle>
              <CardDescription>Análise executiva baseada em IA</CardDescription>
            </div>
          </div>
          {!result && !loading && (
            <Button size="sm" onClick={generateSummary} className="gap-2">
              <Brain className="w-4 h-4" />
              Gerar Resumo
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ) : result ? (
          <div className="space-y-6 animate-fade-in">
            {/* Texto do Resumo */}
            <div className="relative">
              <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 italic">
                "{result.summary}"
              </p>
            </div>

            {/* Tendências */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.trends.map((trend, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-3 rounded-xl border flex items-start gap-3",
                    trend.sentiment === 'positive' ? "bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30" :
                    trend.sentiment === 'negative' ? "bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30" :
                    "bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-full",
                    trend.sentiment === 'positive' ? "text-green-600" :
                    trend.sentiment === 'negative' ? "text-red-600" :
                    "text-slate-600"
                  )}>
                    {trend.sentiment === 'positive' ? <TrendingUp className="w-4 h-4" /> :
                     trend.sentiment === 'negative' ? <TrendingDown className="w-4 h-4" /> :
                     <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{trend.metric}</p>
                    <p className="text-sm font-medium">{trend.observation}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Riscos e Alertas */}
            {result.keyRisks.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <h4 className="text-sm font-bold uppercase tracking-wide">Riscos & Atenção</h4>
                </div>
                <ul className="space-y-1.5">
                  {result.keyRisks.map((risk, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conselho Clínico */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <h4 className="text-sm font-bold uppercase tracking-wide">Estratégia Recomendada</h4>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {result.clinicalAdvice}
              </p>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setResult(null)} 
              className="w-full text-xs"
            >
              Recalcular Análise
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
              <FileText className="w-8 h-8 text-primary/40" />
            </div>
            <div>
              <p className="text-sm text-slate-500">
                O histórico clínico está pronto para ser processado.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                A IA analisará as últimas sessões e padrões de evolução.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
