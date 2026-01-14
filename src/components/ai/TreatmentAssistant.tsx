import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Brain,
  Sparkles,
  TrendingUp,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Target,
  FileCheck,
  Wand2,
  Plus
} from 'lucide-react';

interface TreatmentAssistantProps {
  patientId: string;
  patientName: string;
  onApplyToSoap?: (field: 'subjective' | 'objective' | 'assessment' | 'plan', content: string) => void;
}

export function TreatmentAssistant({ patientId, patientName, onApplyToSoap }: TreatmentAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const callAI = async (action: string) => {
    try {
      setLoading(true);
      setActiveAction(action);
      setSuggestion(null);

      const { data, error } = await supabase.functions.invoke('ai-treatment-assistant', {
        body: { patientId, action }
      });

      if (error) throw error;

      setSuggestion(data.suggestion);
      
      toast({
        title: '✨ Análise de IA concluída',
        description: 'Sugestões geradas com sucesso',
      });
    } catch (error: unknown) {
      toast({
        title: 'Erro na análise',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Gradient */}
      <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-primary rounded-xl shadow-medical">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Assistente de IA</CardTitle>
              <CardDescription>
                Análise inteligente para {patientName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary/50"
          onClick={() => !loading && callAI('suggest_treatment')}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold">Sugerir Conduta</h3>
              <p className="text-sm text-muted-foreground">
                IA analisa o histórico e sugere tratamento baseado em evidências
              </p>
              {loading && activeAction === 'suggest_treatment' && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary/50"
          onClick={() => !loading && callAI('predict_adherence')}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <TrendingUp className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold">Predição de Aderência</h3>
              <p className="text-sm text-muted-foreground">
                Identifica risco de abandono e sugere estratégias de engajamento
              </p>
              {loading && activeAction === 'predict_adherence' && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary/50"
          onClick={() => !loading && callAI('generate_report')}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold">Gerar Relatório</h3>
              <p className="text-sm text-muted-foreground">
                Cria relatório profissional automático com análise completa
              </p>
              {loading && activeAction === 'generate_report' && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Display */}
      {suggestion && (
        <Card className="border-2 border-primary/30 shadow-2xl animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-background">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Análise de IA</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ScrollArea className="h-[400px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {suggestion.split('\n').map((line, idx) => {
                  // Detectar cabeçalhos
                  if (line.match(/^\d+\./)) {
                    return (
                      <div key={idx} className="mt-4">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                          <h4 className="font-semibold text-lg m-0">{line}</h4>
                        </div>
                      </div>
                    );
                  }
                  // Detectar alertas
                  if (line.toLowerCase().includes('alerta') || line.toLowerCase().includes('atenção')) {
                    return (
                      <div key={idx} className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg my-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                        <p className="m-0">{line}</p>
                      </div>
                    );
                  }
                  // Texto normal
                  if (line.trim()) {
                    return <p key={idx} className="my-2">{line}</p>;
                  }
                  return <br key={idx} />;
                })}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(suggestion);
                  toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência' });
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Copiar Texto
              </Button>

              {/* Apply to Assessment */}
              <Button
                onClick={() => {
                  onApplyToSoap?.('assessment', suggestion);
                  toast({
                    title: 'Aplicado à Avaliação',
                    description: 'O conteúdo foi adicionado ao campo de Avaliação (A).'
                  });
                }}
                variant="secondary"
                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Aplicar à Avaliação (A)
              </Button>

              {/* Apply to Plan */}
              <Button
                onClick={() => {
                  onApplyToSoap?.('plan', suggestion);
                  toast({
                    title: 'Aplicado ao Plano',
                    description: 'O conteúdo foi adicionado ao campo de Plano (P).'
                  });
                }}
                variant="secondary"
                className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Aplicar ao Plano (P)
              </Button>

              {/* Append to Assessment */}
              <Button
                onClick={() => {
                  onApplyToSoap?.('assessment', '\n\n' + suggestion);
                  toast({
                    title: 'Adicionado à Avaliação',
                    description: 'O conteúdo foi anexado ao campo de Avaliação (A).'
                  });
                }}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Anexar à Avaliação
              </Button>

              {/* Append to Plan */}
              <Button
                onClick={() => {
                  onApplyToSoap?.('plan', '\n\n' + suggestion);
                  toast({
                    title: 'Anexado ao Plano',
                    description: 'O conteúdo foi anexado ao campo de Plano (P).'
                  });
                }}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Anexar ao Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Badge */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Powered by Gemini AI</p>
              <p className="text-muted-foreground">
                Análises baseadas em evidências científicas e guidelines internacionais de fisioterapia.
                As sugestões devem ser sempre validadas pelo profissional responsável.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
