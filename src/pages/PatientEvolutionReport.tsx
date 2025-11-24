import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PatientEvolutionDashboard } from "@/components/patients/PatientEvolutionDashboard";
import { ProgressAnalysisCard } from "@/components/patients/ProgressAnalysisCard";
import { usePatientEvolutionReport } from "@/hooks/usePatientEvolutionReport";
import { usePatients } from "@/hooks/usePatients";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Printer, Activity } from "lucide-react";
import { LoadingSkeleton, EmptyState } from "@/components/ui";
import { generateEvolutionPDF } from "@/lib/export/evolutionPdfExport";
import { toast } from "sonner";

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

    try {
      const pdf = generateEvolutionPDF(
        {
          name: patient.name,
          phone: patient.phone || undefined,
          email: patient.email || undefined,
          birthDate: patient.birthDate,
        },
        evolutionData.sessions,
        {
          currentPainLevel: evolutionData.currentPainLevel,
          initialPainLevel: evolutionData.initialPainLevel,
          totalSessions: evolutionData.totalSessions,
          averageImprovement: evolutionData.averageImprovement,
        }
      );

      pdf.save(`evolucao-${patient.name.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
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

        {/* Dashboard Principal */}
        <PatientEvolutionDashboard
          patientId={patientId || ""}
          patientName={patient?.name || "Paciente"}
          sessions={evolutionData.sessions}
          currentPainLevel={evolutionData.currentPainLevel}
          initialPainLevel={evolutionData.initialPainLevel}
          totalSessions={evolutionData.totalSessions}
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
