import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PatientEvolutionDashboard } from "@/components/patients/PatientEvolutionDashboard";
import { usePatientEvolutionReport } from "@/hooks/usePatientEvolutionReport";
import { usePatients } from "@/hooks/usePatients";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { LoadingSkeleton, EmptyState } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";

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
    // TODO: Implementar exportação para PDF
    console.log("Exportar para PDF");
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
      <div className="space-y-6 print:space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Dashboard */}
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
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground text-center">
                Relatório gerado em {new Date().toLocaleDateString("pt-BR")} • FisioFlow
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default PatientEvolutionReport;
