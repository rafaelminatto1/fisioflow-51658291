import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { DoctorReferralPDF } from './DoctorReferralPDF';
import { FileDown, FileText, Loader2, Share2, Brain, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useSoapRecordsV2 } from '@/hooks/useSoapRecordsV2';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DoctorReferralReportGeneratorProps {
  patientId: string;
  patientName: string;
  birthDate?: string;
  condition: string;
}

export function DoctorReferralReportGenerator({
  patientId,
  patientName,
  birthDate,
  condition
}: DoctorReferralReportGeneratorProps) {
  const { profile: clinicProfile } = useAuth();
  const { profile: gamificationProfile, progressPercentage } = useGamification(patientId);
  const { data: records = [] } = useSoapRecordsV2(patientId);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const generateAISummary = async () => {
    setGeneratingAI(true);
    try {
      const history = records.slice(0, 5).map(r => ({
        date: r.recordDate,
        subjective: r.subjective,
        objective: r.objective,
      }));

      const response = await fetch('https://southamerica-east1-fisioflow-migration.cloudfunctions.net/aiServiceHttp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'patientExecutiveSummary',
          patientName,
          condition,
          history,
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setAiSummary(result.data.summary);
        toast.success('Sumário IA preparado para o relatório!');
      }
    } catch (error) {
      console.error('AI Summary error:', error);
      toast.error('Erro ao gerar sumário IA. Usando dados básicos.');
      setAiSummary("Paciente em tratamento fisioterapêutico regular apresentando evolução gradual conforme plano de cuidados estabelecido.");
    } finally {
      setGeneratingAI(false);
    }
  };

  const reportData = {
    patient: {
      name: patientName,
      birthDate: birthDate ? format(new Date(birthDate), 'dd/MM/yyyy') : 'N/I',
      condition,
      lastSession: records[0]?.recordDate ? format(new Date(records[0].recordDate), 'dd/MM/yyyy') : 'N/A',
    },
    clinic: {
      name: clinicProfile?.clinic_name || 'Clínica de Fisioterapia',
      doctorName: clinicProfile?.full_name || 'Fisioterapeuta Responsável',
      crf: clinicProfile?.crf_number || '000000-F',
      address: clinicProfile?.address || 'Consultório Profissional',
      phone: clinicProfile?.phone || '(00) 00000-0000',
    },
    analysis: {
      summary: aiSummary || 'Clique em "Analisar com IA" para gerar um parecer detalhado.',
      evolution: records.slice(0, 3).map(r =>
        `${format(new Date(r.recordDate), 'dd/MM')}: ${r.assessment || 'Evolução registrada'}`
      ).join('\n'),
      adherence: Math.round(progressPercentage || 0),
      level: gamificationProfile?.level || 1,
      streaks: gamificationProfile?.current_streak || 0,
    }
  };

  return (
    <Card className="border-indigo-100 bg-indigo-50/30 dark:bg-indigo-950/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400">
            <FileDown className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Relatório para Médico</CardTitle>
            <CardDescription>Gerar PDF profissional com métricas de IA e adesão</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
            <Brain className="w-4 h-4 text-purple-500" />
            <div className="text-xs">
              <p className="font-bold text-slate-500">PARECER IA</p>
              <p className={aiSummary ? "text-green-600 font-medium" : "text-slate-400"}>
                {aiSummary ? "Pronto" : "Pendente"}
              </p>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <div className="text-xs">
              <p className="font-bold text-slate-500">ADESÃO</p>
              <p className="text-indigo-600 font-medium">{reportData.analysis.adherence}%</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!aiSummary && (
            <Button 
              onClick={generateAISummary} 
              disabled={generatingAI}
              variant="outline"
              className="w-full gap-2 border-purple-200 hover:bg-purple-50 text-purple-700 dark:border-purple-900 dark:hover:bg-purple-900/20"
            >
              {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Analisar com IA para Relatório
            </Button>
          )}

          <PDFDownloadLink
            document={<DoctorReferralPDF {...reportData} />}
            fileName={`Relatorio_${patientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`}
            className="w-full"
          >
            {({ loading }) => (
              <Button 
                disabled={loading || !aiSummary} 
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Baixar Relatório PDF
              </Button>
            )}
          </PDFDownloadLink>

          <Button variant="ghost" className="w-full gap-2 text-xs text-slate-500">
            <Share2 className="w-3 h-3" />
            Enviar diretamente via WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
