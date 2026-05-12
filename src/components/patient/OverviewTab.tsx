import React, { Suspense, lazy } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { TrendingUp } from "lucide-react";
import { Patient } from "@/types";
import { ProfileTab } from "@/hooks/usePatientProfileOptimized";
import { usePatientEvolutionReport } from "@/hooks/usePatientEvolutionReport";
import { FisioPredictIndicator } from "@/features/ia-studio/components/FisioPredictIndicator";
import { PatientGamificationSummary } from "@/components/patients/PatientGamificationSummary";
import { SemanticRecommenderWidget } from "./SemanticRecommenderWidget";
import { SimilarPatientsWidget } from "./SimilarPatientsWidget";
import { RecoveryTrajectoryWidget } from "./RecoveryTrajectoryWidget";

const LazyPatientDashboard360 = lazy(() =>
  import("@/components/patient/dashboard/PatientDashboard360").then((m) => ({
    default: m.PatientDashboard360,
  })),
);
const LazyMedicalReturnCard = lazy(() =>
  import("@/components/evolution/MedicalReturnCard").then((m) => ({
    default: m.MedicalReturnCard,
  })),
);
const LazySurgeriesCard = lazy(() =>
  import("@/components/evolution/SurgeriesCard").then((m) => ({
    default: m.SurgeriesCard,
  })),
);
const LazyMetasCard = lazy(() =>
  import("@/components/evolution/MetasCard").then((m) => ({
    default: m.MetasCard,
  })),
);
const LazyEvolutionDashboard = lazy(() =>
  import("@/components/clinical/EvolutionDashboard").then((m) => ({
    default: m.EvolutionDashboard,
  })),
);

interface OverviewTabProps {
  patient: Patient;
  upcomingAppointments: Array<{ id: string; date?: string; start_time?: string; status?: string }>;
  invalidateTab: (tab: ProfileTab) => void;
}

export const OverviewTab = ({
  patient,
  upcomingAppointments,
  invalidateTab,
}: OverviewTabProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _evolutionData } = usePatientEvolutionReport(patient.id);

  return (
    <div className="space-y-6">
      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazyPatientDashboard360
          patient={{
            id: patient.id,
            full_name: patient.full_name || patient.name,
            email: patient.email || undefined,
            phone: patient.phone || undefined,
            birth_date: patient.birth_date || patient.birthDate,
            address: patient.address || undefined,
            city: patient.city || undefined,
            state: patient.state || undefined,
            gender: patient.gender,
            status: patient.status,
          }}
          appointments={upcomingAppointments}
          onAction={() => {}}
        />
      </Suspense>

      {/* AI Predictive Analytics & Clinical Knowledge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <FisioPredictIndicator patientId={patient.id} />
          <SimilarPatientsWidget patientId={patient.id} />
          <RecoveryTrajectoryWidget patientId={patient.id} />
        </div>
        <SemanticRecommenderWidget condition={(patient as any).main_condition || "Não informada"} />
      </div>

      {/* Evolution Management Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyMedicalReturnCard
            patient={patient}
            patientId={patient.id}
            onPatientUpdated={() => invalidateTab("overview")}
          />
        </Suspense>
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazySurgeriesCard patientId={patient.id} />
        </Suspense>
      </div>

      <Suspense fallback={<LoadingSkeleton type="card" />}>
        <LazyMetasCard patientId={patient.id} />
      </Suspense>

      <PatientGamificationSummary patientId={patient.id} />

      {/* Clinical Evolution Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Evolução Clínica
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 font-bold hover:text-blue-700 hover:bg-blue-50"
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.set("tab", "evolution");
              navigate(`?${params.toString()}`, { replace: true });
            }}
          >
            Ver Completo →
          </Button>
        </div>
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyEvolutionDashboard patientId={patient.id} />
        </Suspense>
      </div>
    </div>
  );
};
