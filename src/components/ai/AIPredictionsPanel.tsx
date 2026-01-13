import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface AIPredictionsPanelProps {
  patientId: string;
}

export function AIPredictionsPanel({ patientId }: AIPredictionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<{
    adherenceRisk: string;
    riskScore: number;
    factors: string;
  } | null>(null);

  const runPredictions = async () => {
    try {
      setLoading(true);
      setPredictions(null);

      const { data, error } = await supabase.functions.invoke('ai-treatment-assistant', {
        body: { patientId, action: 'predict_adherence' }
      });

      if (error) throw error;

      const suggestion = data.suggestion;
      
      const riskMatch = suggestion.match(/Risco.*?(Baixo|Médio|Alto)/i);
      const risk = riskMatch ? riskMatch[1] : 'Médio';
      
      setPredictions({
        adherenceRisk: risk,
        riskScore: risk === 'Baixo' ? 20 : risk === 'Médio' ? 50 : 80,
        factors: suggestion,
      });
      
      toast({
        title: '🔮 Predições geradas',
        description: 'Análise preditiva concluída',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro ao gerar predições',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'Baixo') return 'text-green-600';
    if (risk === 'Médio') return 'text-amber-600';
    return 'text-red-600';
  };

  const getRiskBadge = (risk: string) => {
    if (risk === 'Baixo') return 'default';
    if (risk === 'Médio') return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Predições de IA</CardTitle>
              <CardDescription>
                Análise preditiva para otimizar tratamento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runPredictions} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando dados...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Gerar Predições
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {predictions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risco de Abandono
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nível de Risco:</span>
                <Badge variant={getRiskBadge(predictions.adherenceRisk)}>
                  {predictions.adherenceRisk}
                </Badge>
              </div>
              <Progress value={predictions.riskScore} className="h-2" />
              <p className={`text-2xl font-bold ${getRiskColor(predictions.adherenceRisk)}`}>
                {predictions.riskScore}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Taxa de Sucesso Estimada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Probabilidade:</span>
                <Badge variant="default">
                  {100 - predictions.riskScore}%
                </Badge>
              </div>
              <Progress value={100 - predictions.riskScore} className="h-2" />
              <p className="text-2xl font-bold text-green-600">
                {100 - predictions.riskScore}%
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Análise Detalhada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {predictions.factors.split('\n').map((line: string, idx: number) => {
                  if (line.trim()) {
                    return <p key={idx} className="my-2">{line}</p>;
                  }
                  return <br key={idx} />;
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
