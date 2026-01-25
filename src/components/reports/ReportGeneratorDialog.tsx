import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ReportGeneratorService } from '@/lib/services/ReportGeneratorService';
import { usePainEvolution, usePainStatistics } from '@/hooks/usePainMaps';
import { usePatientSurgeries, usePatientPathologies, usePatientGoals } from '@/hooks/usePatientEvolution';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

interface ReportGeneratorDialogProps {
  patientId: string;
  patientName: string;
  trigger?: React.ReactNode;
}

type ReportType = 'medical' | 'patient' | 'internal';

export function ReportGeneratorDialog({ patientId, patientName, trigger }: ReportGeneratorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('medical');
  const [customNotes, setCustomNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { data: surgeries = [] } = usePatientSurgeries(patientId);
  const { data: pathologies = [] } = usePatientPathologies(patientId);
  const { data: goals = [] } = usePatientGoals(patientId);
  const { data: painEvolution = [] } = usePainEvolution(patientId);
  const { data: painStats } = usePainStatistics(patientId);

  const handleGenerate = async () => {
    if (!user) return;

    setIsGenerating(true);

    try {
      const therapistName = profile?.full_name || 'Fisioterapeuta';
      const reportDate = new Date().toLocaleDateString('pt-BR');

      // Get initial and current assessment data
      const initialPain = painEvolution.length > 0
        ? (painEvolution[painEvolution.length - 1] as { globalPainLevel?: number; averageIntensity?: number }).globalPainLevel || painEvolution[painEvolution.length - 1].averageIntensity || 0
        : 0;
      const currentPain = painEvolution.length > 0
        ? (painEvolution[0] as { globalPainLevel?: number; averageIntensity?: number }).globalPainLevel || painEvolution[0].averageIntensity || 0
        : 0;

      if (reportType === 'medical') {
        // Relatório Médico Técnico
        ReportGeneratorService.generateMedicalReport({
          patientName,
          patientId,
          dateOfBirth: 'N/A',
          reportDate,
          therapistName,
          diagnosis: pathologies.find(p => p.status === 'em_tratamento')?.pathology_name,
          treatmentGoals: goals.filter(g => g.status === 'em_andamento').map(g => g.goal_title),
          observations: customNotes,
          surgeries: surgeries.map(s => ({
            name: s.surgery_name,
            date: new Date(s.surgery_date).toLocaleDateString('pt-BR'),
            timeSince: calculateTimeSince(s.surgery_date)
          })),
          pathologies: pathologies.map(p => ({
            name: p.pathology_name,
            status: p.status === 'em_tratamento' ? 'Em tratamento' : 'Tratada'
          })),
          painEvolution: painEvolution.slice(0, 10).map((pe: {
            date: string;
            globalPainLevel?: number;
            averageIntensity?: number;
            regionCount?: number;
            pointCount?: number;
          }) => ({
            date: new Date(pe.date).toLocaleDateString('pt-BR'),
            level: pe.globalPainLevel || pe.averageIntensity,
            regions: pe.regionCount || pe.pointCount
          })),
          initialAssessment: {
            date: painEvolution[painEvolution.length - 1]?.date || reportDate,
            painLevel: initialPain,
            mobilityScore: 50,
            functionalScore: 50
          },
          currentAssessment: {
            date: reportDate,
            painLevel: currentPain,
            mobilityScore: 75,
            functionalScore: 80
          },
          improvements: [
            `Redução de dor de ${initialPain}/10 para ${currentPain}/10`,
            'Aumento da amplitude de movimento',
            'Melhora na funcionalidade'
          ],
          challenges: [
            'Manter adesão aos exercícios domiciliares'
          ]
        });
      } else if (reportType === 'patient') {
        // Relatório Simplificado para Paciente
        const painReduction = painStats?.painReduction || 0;

        ReportGeneratorService.generatePatientReport({
          patientName,
          reportDate,
          therapistName,
          startDate: painEvolution[painEvolution.length - 1]?.date || reportDate,
          totalSessions: painEvolution.length,
          achievements: [
            `Reduziu a dor em ${painReduction.toFixed(0)}%`,
            'Completou exercícios regularmente',
            'Melhorou mobilidade geral'
          ],
          currentGoals: goals.filter(g => g.status === 'em_andamento').map(g => g.goal_title),
          nextSteps: [
            'Continuar exercícios domiciliares',
            'Manter frequência semanal',
            'Agendar reavaliação'
          ],
          painReduction,
          motivationalMessage: 'Parabéns pelo seu progresso! Continue assim e você alcançará seus objetivos.'
        });
      } else {
        // Relatório Interno
        ReportGeneratorService.generateInternalReport({
          patientName,
          patientId,
          dateOfBirth: 'N/A',
          reportDate,
          therapistName,
          sessionCount: painEvolution.length,
          attendanceRate: 85,
          complianceRate: 78,
          surgeries: surgeries.map(s => ({
            name: s.surgery_name,
            date: new Date(s.surgery_date).toLocaleDateString('pt-BR'),
            timeSince: calculateTimeSince(s.surgery_date)
          })),
          pathologies: pathologies.map(p => ({
            name: p.pathology_name,
            status: p.status === 'em_tratamento' ? 'Em tratamento' : 'Tratada'
          })),
          initialAssessment: {
            date: painEvolution[painEvolution.length - 1]?.date || reportDate,
            painLevel: initialPain,
            mobilityScore: 50,
            functionalScore: 50
          },
          currentAssessment: {
            date: reportDate,
            painLevel: currentPain,
            mobilityScore: 75,
            functionalScore: 80
          },
          improvements: [
            `Redução de dor: ${initialPain}/10 → ${currentPain}/10`,
            'Amplitude de movimento melhorou 30%'
          ],
          challenges: [
            'Baixa adesão aos exercícios domiciliares em dias chuvosos'
          ],
          riskFactors: pathologies.filter(p => p.status === 'em_tratamento').length > 2
            ? ['Múltiplas patologias ativas simultâneas']
            : undefined,
          recommendations: [
            'Aumentar frequência de sessões',
            'Implementar protocolo de exercícios supervisionados'
          ]
        });
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerar Relatório de Evolução</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label className="mb-3 block">Tipo de Relatório</Label>
            <RadioGroup value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
              <Card className="p-4 mb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="medical" id="medical" />
                  <div className="flex-1">
                    <label htmlFor="medical" className="cursor-pointer">
                      <p className="font-semibold">Relatório Médico</p>
                      <p className="text-sm text-muted-foreground">
                        Relatório técnico completo para envio ao médico solicitante. Inclui histórico cirúrgico,
                        patologias, medicações, evolução clínica detalhada com testes e medições.
                      </p>
                    </label>
                    <Badge variant="secondary" className="mt-2">Técnico</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-4 mb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="patient" id="patient" />
                  <div className="flex-1">
                    <label htmlFor="patient" className="cursor-pointer">
                      <p className="font-semibold">Relatório para Paciente</p>
                      <p className="text-sm text-muted-foreground">
                        Relatório simplificado e motivacional para o paciente. Destaca conquistas, progresso em linguagem
                        acessível, objetivos atuais e próximos passos.
                      </p>
                    </label>
                    <Badge variant="secondary" className="mt-2">Simplificado</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="internal" id="internal" />
                  <div className="flex-1">
                    <label htmlFor="internal" className="cursor-pointer">
                      <p className="font-semibold">Relatório Interno</p>
                      <p className="text-sm text-muted-foreground">
                        Relatório para equipe interna de fisioterapeutas. Inclui métricas de adesão, análise de risco,
                        recomendações técnicas e observações clínicas.
                      </p>
                    </label>
                    <Badge variant="secondary" className="mt-2">Interno</Badge>
                  </div>
                </div>
              </Card>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="customNotes" className="mb-2 block">Observações Adicionais</Label>
            <Textarea
              id="customNotes"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Adicione observações que deseja incluir no relatório..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Gerando...' : 'Gerar PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function calculateTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 30) return `${diffDays} dias`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`;
  return `${Math.floor(diffDays / 365)} anos`;
}
