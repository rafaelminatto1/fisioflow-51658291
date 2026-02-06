/**
 * Clinical Analysis Page - Google AI Suite (EXPANDIDA)
 *
 * Funcionalidades:
 * - Chat interativo com RAG
 * - Análise com MedLM
 * - Timeline de progresso
 * - Voz (Speech-to-Text e Text-to-Speech)
 * - Exportação PDF
 * - Comparação evolutiva
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePatientsPostgres } from '@/hooks/useDataConnect';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardTabs, CardTabsContent, CardTabsList, CardTabsTrigger } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Sparkles,
  Activity,
  MessageCircle,
  TrendingUp,
  FileText,
  Download,
  Mic,
  Volume2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { ChatInterface } from '@/components/ai/ChatInterface';
import { ProgressTimeline } from '@/components/ai/ProgressTimeline';

interface Patient {
  id: string;
  name: string;
  email?: string;
}

interface AnalysisHistory {
  id: string;
  date: Date;
  summary: string;
  score?: number;
  improvement?: number;
}

interface Alert {
  id: string;
  type: 'risk' | 'milestone' | 'info';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export default function ClinicalAnalysisPage() {
  const { data: patients } = usePatientsPostgres('default');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [useRAG, setUseRAG] = useState(true);
  const [useMedLM, setUseMedLM] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { toast } = useToast();

  // Buscar histórico de análises quando paciente é selecionado
  useEffect(() => {
    if (!selectedPatient) {
      setAnalysisHistory([]);
      setAlerts([]);
      setSelectedPatientData(null);
      return;
    }

    const patient = patients?.find((p: Patient) => p.id === selectedPatient);
    if (patient) {
      setSelectedPatientData(patient);
      // TODO: Buscar histórico real do backend
      // Por enquanto, mock data
      setAnalysisHistory([
        {
          id: '1',
          date: new Date(2026, 1, 25),
          summary: 'Paciente apresentando melhora na flexão de joelho esquerdo',
          score: 65,
          improvement: 44,
        },
        {
          id: '2',
          date: new Date(2026, 1, 15),
          summary: 'Início de protocolo de fortalecimento de quadríceps',
          score: 58,
          improvement: 22,
        },
        {
          id: '3',
          date: new Date(2026, 1, 5),
          summary: 'Avaliação inicial: Limitação significativa de movimento',
          score: 45,
          improvement: 0,
        },
      ]);

      // Alertas simulados
      setAlerts([
        {
          id: '1',
          type: 'milestone',
          title: 'Progresso Significativo',
          description: 'Paciente alcançou 85% da flexão normal do joelho',
          severity: 'low',
        },
        {
          id: '2',
          type: 'info',
          title: 'Próxima Reavaliação',
          description: 'Sugerida para 15/02/2026',
          severity: 'medium',
        },
      ]);
    }
  }, [selectedPatient, patients]);

  const selectedPatientObj = patients?.find((p: Patient) => p.id === selectedPatient);

  const handleExportPDF = async () => {
    if (!selectedPatient) return;

    try {
      toast({
        title: 'Gerando PDF...',
        description: 'Aguarde enquanto criamos o relatório.',
      });

      const generateReport = httpsCallable(functions, 'generateClinicalReport');
      await generateReport({
        patientId: selectedPatient,
        includeHistory: true,
        includeAlerts: true,
        format: 'pdf',
      });

      toast({
        title: 'PDF Gerado!',
        description: 'Relatório salvo no Google Drive.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Falha ao gerar PDF.',
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">IA Clínica (Google AI Suite)</h1>
              <p className="text-gray-500">Análise clínica avançada com Gemini, MedLM e RAG</p>
            </div>
          </div>

          {/* Opções */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <MessageCircle className="w-4 h-4 text-gray-600" />
              <Switch
                checked={useRAG}
                onCheckedChange={setUseRAG}
                id="rag-toggle"
              />
              <label htmlFor="rag-toggle" className="text-sm text-gray-600">
                RAG
              </label>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <Switch
                checked={useMedLM}
                onCheckedChange={setUseMedLM}
                id="medlm-toggle"
              />
              <label htmlFor="medlm-toggle" className="text-sm text-gray-600">
                MedLM
              </label>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <Volume2 className="w-4 h-4 text-green-600" />
              <Switch
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
                id="voice-toggle"
              />
              <label htmlFor="voice-toggle" className="text-sm text-gray-600">
                Voz
              </label>
            </div>
          </div>
        </div>

        {/* Patient Selection */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Selecione o Paciente
                </label>
                <Select onValueChange={(value) => {
                  setSelectedPatient(value);
                }} value={selectedPatient}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um paciente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((p: Patient) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.email && `(${p.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPatient && (
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {selectedPatient && (
          <>
            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {alerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={`border-l-4 ${
                      alert.severity === 'high'
                        ? 'border-red-500 bg-red-50'
                        : alert.severity === 'medium'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {alert.type === 'milestone' ? (
                          <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : alert.type === 'risk' ? (
                          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        ) : (
                          <Activity className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                        <div>
                          <h4 className="font-semibold text-sm">{alert.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Chat IA
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="comparison" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Comparação
                </TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat">
                <ChatInterface
                  patientId={selectedPatient}
                  patientName={selectedPatientObj?.name || ''}
                />
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Análises</CardTitle>
                    <CardDescription>
                      Análises anteriores do paciente {selectedPatientObj?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {analysisHistory.map((entry) => (
                          <Card key={entry.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm text-gray-500">
                                {entry.date.toLocaleDateString('pt-BR')}
                              </div>
                              {entry.score && (
                                <Badge variant="outline">
                                  Score: {entry.score}
                                </Badge>
                              )}
                              {entry.improvement !== undefined && (
                                <Badge
                                  variant={entry.improvement >= 0 ? 'default' : 'destructive'}
                                  className={
                                    entry.improvement >= 0
                                      ? 'bg-green-600'
                                      : 'bg-red-600'
                                  }
                                >
                                  {entry.improvement >= 0 ? '+' : ''}
                                  {entry.improvement}% vs anterior
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{entry.summary}</p>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline">
                <ProgressTimeline
                  patientId={selectedPatient}
                  patientName={selectedPatientObj?.name || ''}
                />
              </TabsContent>

              {/* Comparison Tab */}
              <TabsContent value="comparison">
                <Card>
                  <CardHeader>
                    <CardTitle>Comparação Evolutiva</CardTitle>
                    <CardDescription>
                      Compare o progresso ao longo do tempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {analysisHistory.length >= 2 && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50 rounded-lg border">
                              <h4 className="font-semibold mb-2 text-sm text-gray-600">
                                {analysisHistory[analysisHistory.length - 1]?.date.toLocaleDateString('pt-BR')}
                              </h4>
                              <p className="text-sm">
                                {analysisHistory[analysisHistory.length - 1]?.summary}
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                              <h4 className="font-semibold mb-2 text-sm text-gray-600">
                                {analysisHistory[0]?.date.toLocaleDateString('pt-BR')}
                              </h4>
                              <p className="text-sm">
                                {analysisHistory[0]?.summary}
                              </p>
                            </div>
                          </div>
                          <div className="text-center text-sm text-gray-500">
                            📊 Evolução de{' '}
                            <span className="font-semibold text-green-600">
                              {analysisHistory[analysisHistory.length - 1]?.improvement}%
                            </span>{' '}
                            desde o início do tratamento
                          </div>
                        </>
                      )}

                      {analysisHistory.length < 2 && (
                        <div className="text-center py-12 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p>Histórico insuficiente para comparação</p>
                          <p className="text-sm mt-1">
                            Mínimo 2 análises são necessárias
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Empty State */}
        {!selectedPatient && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center text-gray-500">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">
                  Selecione um Paciente
                </h3>
                <p className="text-sm">
                  Escolha um paciente acima para iniciar a análise clínica com IA
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
