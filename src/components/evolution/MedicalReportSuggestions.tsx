import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Lightbulb,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, collection, query, where, getDocs, orderBy, limit } from '@/integrations/firebase/app';
import { useAI } from '@/integrations/firebase/ai';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface MedicalReportSuggestionsProps {
  patientId: string;
}

interface ClinicalInsight {
  title: string;
  description: string;
  type: 'improvement' | 'alert' | 'recommendation';
}

export const MedicalReportSuggestions: React.FC<MedicalReportSuggestionsProps> = ({
  patientId
}) => {
  const { toast } = useToast();
  const { generate } = useAI();
  const [insights, setInsights] = useState<ClinicalInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedId] = useState<number | null>(null);

  const generateAIInsights = async () => {
    if (!patientId) return;
    
    setIsLoading(true);
    try {
      // 1. Buscar dados históricos do Firestore (substituindo Supabase)
      const soapRef = collection(db, 'soap_records');
      const soapQuery = query(soapRef, where('patient_id', '==', patientId), orderBy('created_at', 'desc'), limit(5));
      const soapSnap = await getDocs(soapQuery);
      const history = soapSnap.docs.map(d => d.data());

      const measureRef = collection(db, 'evolution_measurements');
      const measureQuery = query(measureRef, where('patient_id', '==', patientId), orderBy('measured_at', 'desc'), limit(10));
      const measureSnap = await getDocs(measureQuery);
      const metrics = measureSnap.docs.map(d => d.data());

      // 2. Construir prompt rico para o Gemini
      const prompt = `
        Aja como um fisioterapeuta sênior. Analise o histórico clínico do paciente e gere 3 insights estruturados para o relatório de evolução.
        Histórico SOAP Recente: ${JSON.stringify(history)}
        Métricas de Evolução: ${JSON.stringify(metrics)}
        
        Retorne exatamente no formato JSON:
        [{"title": "Título Curto", "description": "Texto profissional", "type": "improvement | alert | recommendation"}]
        Responda em Português Brasileiro.
      `;

      const result = await generate(prompt, {
        userId: 'system-therapist',
        feature: 'clinical_analysis' as any,
      });

      // Parse safely
      try {
        const cleanedContent = result.content.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanedContent);
        setInsights(parsed);
      } catch (e) {
        // Fallback if AI doesn't return clean JSON
        setInsights([{
          title: "Análise de Evolução",
          description: result.content,
          type: "recommendation"
        }]);
      }
    } catch (error) {
      logger.error('Erro ao gerar insights clínicos', error, 'MedicalReportSuggestions');
      toast({ title: "Erro na IA", description: "Não foi possível analisar o histórico agora.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateAIInsights();
  }, [patientId]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    toast({ title: 'Copiado!', description: 'Texto pronto para o seu prontuário.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="border-blue-500/20 shadow-sm">
      <CardHeader className="pb-3 border-b bg-blue-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500 rounded-lg text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Sugestões de Evolução (IA)</CardTitle>
              <CardDescription className="text-[10px]">Baseado no histórico completo do paciente</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={generateAIInsights} disabled={isLoading} className="h-8">
            {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-16 bg-muted animate-pulse rounded-xl" />
            <div className="h-16 bg-muted animate-pulse rounded-xl" />
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm italic">Nenhum dado suficiente para gerar insights automáticos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="group relative p-3 rounded-xl border border-border/50 bg-card hover:border-blue-300 transition-all">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 p-1 rounded ${
                    insight.type === 'improvement' ? 'bg-green-100 text-green-600' : 
                    insight.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {insight.type === 'improvement' ? <TrendingUp className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs mb-1">{insight.title}</p>
                    <p className="text-sm text-foreground/80 leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
                      "{insight.description}"
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(insight.description, idx)}
                  >
                    {copiedIndex === idx ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};