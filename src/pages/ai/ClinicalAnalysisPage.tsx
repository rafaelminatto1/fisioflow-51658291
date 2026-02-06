import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePatientsPostgres } from '@/hooks/useDataConnect';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Sparkles, Activity } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

export default function ClinicalAnalysisPage() {
  const { data: patients } = usePatientsPostgres('default'); // Trazendo do Postgres rapidão
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!selectedPatient) return;

    setLoading(true);
    setAnalysis('');

    try {
      const analyzeProgress = httpsCallable(functions, 'analyzeProgress');
      const result = await analyzeProgress({ patientId: selectedPatient });
      
      // O Genkit retorna o texto dentro de data.text ou estrutura similar dependendo do fluxo
      const aiResponse = (result.data as unknown).text || (result.data as unknown).analysis || JSON.stringify(result.data);
      setAnalysis(aiResponse);

      toast({
        title: "Análise Concluída",
        description: "O Genkit processou o histórico clínico com sucesso.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro na Análise",
        description: "Falha ao comunicar com o Google Vertex AI.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-purple-100 rounded-lg">
          <Brain className="w-8 h-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IA Clínica (Genkit)</h1>
          <p className="text-gray-500">Analise o progresso e identifique padrões ocultos no tratamento usando Gemini 1.5.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Painel de Controle */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>Selecione o paciente para análise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paciente</label>
              <Select onValueChange={setSelectedPatient} value={selectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((p: unknown) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              onClick={handleAnalyze}
              disabled={!selectedPatient || loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Análise Genkit</span>
                </div>
              )}
            </Button>

            <div className="text-xs text-gray-500 mt-4">
              * Utiliza Google Vertex AI para ler todo o prontuário do Postgres.
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card className="md:col-span-2 min-h-[500px]">
          <CardHeader>
            <CardTitle>Relatório de Inteligência</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <div className="prose prose-purple max-w-none">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed rounded-lg">
                <Activity className="w-12 h-12 mb-2 opacity-20" />
                <p>Selecione um paciente para iniciar a análise.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </MainLayout>
  );
}
