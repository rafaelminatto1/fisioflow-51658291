/**
 * Treatment Assistant Component - Migrated to Neon/Cloudflare
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { aiApi } from '@/api/v2';
import { getWorkersApiUrl } from '@/lib/api/config';
import { getNeonAccessToken } from '@/lib/auth/neon-token';
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
  Plus,
  Zap,
} from 'lucide-react';

interface TreatmentAssistantProps {
  patientId: string;
  patientName: string;
  currentObservation?: string;
  onApplyToSoap?: (
    field: 'subjective' | 'objective' | 'assessment' | 'plan',
    content: string
  ) => void;
}

export function TreatmentAssistant({
  patientId,
  patientName,
  currentObservation,
  onApplyToSoap,
}: TreatmentAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null | undefined>(undefined);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  interface TreatmentAssistantResponse {
    error?: string;
    suggestion?: string;
  }

  const callAI = async (action: string) => {
    try {
      setLoading(true);
      setActiveAction(action);
      setSuggestion(null);

      const result = await aiApi.treatmentAssistant({
        patientId,
        action,
        context: currentObservation?.trim(),
      });
      const data = result.data as TreatmentAssistantResponse;

      if (data.error) throw new Error(data.error);
      setSuggestion(data.suggestion || 'A análise foi concluída, mas não retornou conteúdo.');

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

  const callNativeAI = async (action: 'summarize' | 'translate', text: string) => {
    try {
      setLoading(true);
      setActiveAction(action);
      setSuggestion(null);
      const token = await getNeonAccessToken();

      const response = await fetch(`${getWorkersApiUrl()}/api/ai/native/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`Falha na IA nativa (${response.status})`);
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const output = action === 'summarize' ? result.data?.summary : result.data?.translated;
      setSuggestion(output || 'O processamento terminou, mas não retornou conteúdo.');

      toast({
        title: '✨ IA Nativa (Llama 3.1)',
        description: 'Processamento concluído com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro na IA Nativa',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    {
      id: 'summarize',
      title: 'Resumo técnico',
      description: 'Sintetiza S/O da evolução atual para leitura rápida.',
      icon: Zap,
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
      run: () => {
        const objective = document.getElementById('objective')?.innerText || '';
        const subjective = document.getElementById('subjective')?.innerText || '';
        const text = (currentObservation?.trim() || `S: ${subjective}\nO: ${objective}`).trim();

        if (text.length < 10) {
          toast({
            title: 'Sem conteúdo suficiente',
            description: 'Escreva ou transcreva a evolução antes de gerar o resumo.',
            variant: 'destructive',
          });
          return;
        }

        callNativeAI('summarize', text);
      },
    },
    {
      id: 'suggest_treatment',
      title: 'Sugerir conduta',
      description: 'Cruza histórico e evidências para orientar o plano.',
      icon: Target,
      tone: 'border-blue-200 bg-blue-50 text-blue-700',
      run: () => callAI('suggest_treatment'),
    },
    {
      id: 'predict_adherence',
      title: 'Predizer aderência',
      description: 'Aponta risco de abandono e próximos contatos.',
      icon: TrendingUp,
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      run: () => callAI('predict_adherence'),
    },
    {
      id: 'generate_report',
      title: 'Gerar relatório',
      description: 'Cria texto profissional para relatório clínico.',
      icon: FileText,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      run: () => callAI('generate_report'),
    },
  ];

  const activeActionTitle = actions.find((action) => action.id === activeAction)?.title;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-slate-50/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Ações de IA</CardTitle>
              <CardDescription>Resultados aplicáveis na evolução de {patientName}</CardDescription>
            </div>
          </div>
          {loading && (
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {activeActionTitle ?? 'Analisando'}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = loading && activeAction === action.id;

            return (
              <button
                key={action.id}
                type="button"
                disabled={loading}
                onClick={action.run}
                className="rounded-lg border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md disabled:pointer-events-none disabled:opacity-70"
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg border p-2 ${action.tone}`}>
                    {isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight">{action.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Card className="border-primary/15 bg-primary/[0.03]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Resultado para aplicar</CardTitle>
            </div>
            <CardDescription>
              Revise o texto antes de inserir na observação clínica ou no plano.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suggestion ? (
              <>
                <ScrollArea className="h-[330px] pr-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {suggestion.split('\n').map((line, idx) => {
                      const trimmedLine = line.trim();
                      if (trimmedLine.startsWith('## ')) {
                        const heading = trimmedLine.replace(/^##\s+/, '');
                        return (
                          <h3
                            key={idx}
                            className="mt-4 border-b pb-1 text-sm font-bold uppercase tracking-wide text-primary first:mt-0"
                          >
                            {heading}
                          </h3>
                        );
                      }

                      // Detectar cabeçalhos
                      if (trimmedLine.match(/^\d+\./)) {
                        return (
                          <div key={idx} className="mt-4">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                              <h4 className="font-semibold text-lg m-0">{trimmedLine}</h4>
                            </div>
                          </div>
                        );
                      }
                      // Detectar alertas
                      if (
                        line.toLowerCase().includes('alerta') ||
                        line.toLowerCase().includes('atenção')
                      ) {
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg my-2"
                          >
                            <AlertTriangle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                            <p className="m-0">{trimmedLine}</p>
                          </div>
                        );
                      }

                      if (trimmedLine.startsWith('- ')) {
                        return (
                          <div key={idx} className="my-1 flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                            <p className="m-0 text-sm">{trimmedLine.replace(/^-\s+/, '')}</p>
                          </div>
                        );
                      }

                      // Texto normal
                      if (trimmedLine) {
                        return (
                          <p key={idx} className="my-2">
                            {trimmedLine}
                          </p>
                        );
                      }
                      return <br key={idx} />;
                    })}
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(suggestion);
                      toast({
                        title: 'Copiado!',
                        description: 'Texto copiado para a área de transferência',
                      });
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Copiar Texto
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      onApplyToSoap?.('assessment', suggestion);
                      toast({
                        title: 'Aplicado à evolução',
                        description: 'O conteúdo foi adicionado à observação clínica.',
                      });
                    }}
                    variant="secondary"
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Aplicar à evolução
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      onApplyToSoap?.('plan', suggestion);
                      toast({
                        title: 'Aplicado ao Plano',
                        description: 'O conteúdo foi adicionado como plano sugerido.',
                      });
                    }}
                    variant="secondary"
                    className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Aplicar ao Plano (P)
                  </Button>

                  <Button
                    onClick={() => {
                      onApplyToSoap?.('assessment', '\n\n' + suggestion);
                      toast({
                        title: 'Anexado à evolução',
                        description: 'O conteúdo foi anexado à observação clínica.',
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Anexar à evolução
                  </Button>

                  <Button
                    onClick={() => {
                      onApplyToSoap?.('plan', '\n\n' + suggestion);
                      toast({
                        title: 'Anexado ao Plano',
                        description: 'O conteúdo foi anexado ao campo de Plano (P).',
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Anexar ao Plano
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed bg-background/60 p-6 text-center">
                <Sparkles className="mb-3 h-8 w-8 text-primary/50" />
                <p className="font-medium">Nenhuma análise gerada ainda</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Escolha uma ação acima. A IA pode sugerir, mas a decisão final continua sendo do
                  profissional responsável.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
