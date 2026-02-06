import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PatientEvolutionDashboard } from '@/components/patients/PatientEvolutionDashboard';
import { ProgressAnalysisCard } from '@/components/patients/ProgressAnalysisCard';
import { usePatientEvolutionReport } from '@/hooks/usePatientEvolutionReport';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileDown, Printer, Activity } from 'lucide-react';
import { LoadingSkeleton, EmptyState } from '@/components/ui';
import { generateEvolutionPDF } from '@/lib/export/evolutionPdfExport';
import { toast } from 'sonner';
import { PatientHelpers } from '@/types';
import { fisioLogger as logger } from '@/lib/errors/logger';

const PatientEvolutionReport = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const { data: patients } = usePatients();
  const patient = patients?.find((p) => p.id === patientId);

  const { data: evolutionData, isLoading } = usePatientEvolutionReport(patientId || "");

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!patient || !evolutionData) {
      toast.error('Dados insuficientes para gerar PDF');
      return;
    }

    const patientName = PatientHelpers.getName(patient);
    try {
      const pdf = generateEvolutionPDF(
        {
          name: patientName,
          phone: patient.phone || undefined,
          email: patient.email || undefined,
          birthDate: patient.birthDate,
        },
        evolutionData.sessions,
        {
          currentPainLevel: evolutionData.currentPainLevel,
          initialPainLevel: evolutionData.initialPainLevel,
          totalSessions: evolutionData.totalSessions,
          prescribedSessions: evolutionData.prescribedSessions,
          averageImprovement: evolutionData.averageImprovement,
          measurementEvolution: evolutionData.measurementEvolution,
        }
      );

      pdf.save(`evolucao-${patientName.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      logger.error('Erro ao gerar PDF', error, 'PatientEvolutionReport');
      toast.error('Erro ao gerar PDF');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <LoadingSkeleton type="card" rows={4} />
        </div>
      </MainLayout>
    );
  }

  if (!evolutionData || evolutionData.sessions.length === 0) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <EmptyState
            title="Nenhum registro encontrado"
            description="Este paciente ainda não possui registros de evolução."
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 print:space-y-4 animate-fade-in">
        {/* Header moderno com gradiente */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-lg border print:hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="hover:scale-105 transition-transform"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Activity className="h-8 w-8 text-primary" />
                    Dashboard 360º
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Visão completa da evolução de {patient?.name}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="gap-2 shadow hover:shadow-lg transition-all"
                >
                  <FileDown className="h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="gap-2 shadow hover:shadow-lg transition-all"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-0" />
        </div>

        {/* Análise de Progresso */}
        <ProgressAnalysisCard sessions={evolutionData.sessions} />

        {/* Evolução de Medições */}
        {evolutionData.measurementEvolution && evolutionData.measurementEvolution.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-6 bg-teal-50/50 border-b flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-teal-900 uppercase tracking-wider text-sm">Evolução dos Marcadores Clínicos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-widest text-[10px] border-b">
                      <th className="px-6 py-4 text-left">Parâmetro</th>
                      <th className="px-6 py-4 text-left">Inicial</th>
                      <th className="px-6 py-4 text-left">Atual</th>
                      <th className="px-6 py-4 text-left">Melhora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {evolutionData.measurementEvolution.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{m.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{m.type}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-600">{m.initial.value}</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-bold">{m.initial.unit}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-teal-700">{m.current.value}</span>
                          <span className="text-[10px] text-slate-500 ml-1 font-bold">{m.current.unit}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${parseFloat(m.improvement.toString()) >= 0
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                            {m.improvement}% {parseFloat(m.improvement.toString()) >= 0 ? '↑' : '↓'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Principal */}
        <PatientEvolutionDashboard
          patientId={patientId || ""}
          patientName={patient?.name || "Paciente"}
          sessions={evolutionData.sessions}
          currentPainLevel={evolutionData.currentPainLevel}
          initialPainLevel={evolutionData.initialPainLevel}
          totalSessions={evolutionData.totalSessions}
          prescribedSessions={evolutionData.prescribedSessions}
          averageImprovement={evolutionData.averageImprovement}
        />

        {/* Print Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t">
          <div className="text-center text-sm text-muted-foreground">
            <p>Relatório gerado em {new Date().toLocaleDateString("pt-BR")}</p>
            <p>FisioFlow - Sistema de Gestão de Fisioterapia</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PatientEvolutionReport;
