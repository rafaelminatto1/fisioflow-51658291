/**
 * FisioFlow - Rotas de Inteligência Artificial
 * @module routes/ai
 */

import { lazy } from "react";
import { Navigate, Route, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RouteErrorBoundary } from "@/components/error";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { patientsApi } from "@/api/v2";
import { PatientHelpers } from "@/types";

// Lazy loads - AI Features
const IAStudio = lazy(() => import(/* webpackChunkName: "ia-studio" */ "@/pages/IAStudio"));
const IntelligenceHub = lazy(
  () => import(/* webpackChunkName: "intelligence-hub" */ "@/pages/IntelligenceHub"),
);
const ClinicalAnalysisPage = lazy(
  () => import(/* webpackChunkName: "ai-clinical" */ "@/pages/ai/ClinicalAnalysisPage"),
);
const DocumentScannerPage = lazy(
  () => import(/* webpackChunkName: "ai-scanner" */ "@/pages/ai/DocumentScannerPage"),
);
const ActivityLabPage = lazy(
  () => import(/* webpackChunkName: "ai-activity-lab" */ "@/pages/ai/ActivityLabPage"),
);
const MedicalChatbot = lazy(
  () => import(/* webpackChunkName: "ai-chatbot" */ "@/components/chatbot/MedicalChatbot"),
);
const ComputerVisionExercise = lazy(
  () =>
    import(
      /* webpackChunkName: "ai-computer-vision" */ "@/components/computer-vision/ComputerVisionExercise"
    ),
);
const IntelligentReports = lazy(
  () =>
    import(
      /* webpackChunkName: "ai-intelligent-reports" */ "@/components/reports/IntelligentReports"
    ),
);
const AugmentedRealityExercise = lazy(
  () => import(/* webpackChunkName: "ai-ar" */ "@/components/ar/AugmentedRealityExercise"),
);

// Image Analysis
const ImageAnalysisDashboard = lazy(
  () =>
    import(
      /* webpackChunkName: "analysis-images" */ "@/components/analysis/dashboard/ImageAnalysisDashboard"
    ),
);
const DynamicCompareDetailsPage = lazy(
  () =>
    import(
      /* webpackChunkName: "analysis-dynamic" */ "@/pages/dashboard/dinamica/DynamicCompareDetailsPage"
    ),
);

function IntelligentReportsRoute() {
  const { patientId = "" } = useParams<{ patientId: string }>();
  const { data: patient } = useQuery({
    queryKey: ["patient-intelligent-reports", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const result = await patientsApi.get(patientId);
      return result?.data ?? null;
    },
    enabled: !!patientId,
  });

  return (
    <MainLayout>
      <IntelligentReports
        patientId={patientId}
        patientName={patient ? PatientHelpers.getName(patient) : "paciente"}
      />
    </MainLayout>
  );
}

export const aiRoutes = (
  <>
    {/* IA Studio Central */}
    <Route
      path="/ia-studio"
      element={
        <ProtectedRoute>
          <IAStudio />
        </ProtectedRoute>
      }
    />

    {/* Intelligence Hub & Legacy Redirects */}
    <Route
      path="/inteligencia"
      element={
        <RouteErrorBoundary routeName="IntelligenceHub">
          <ProtectedRoute>
            <IntelligenceHub />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route path="/smart-dashboard" element={<Navigate to="/inteligencia?tab=clinica" replace />} />
    <Route path="/smart-ai" element={<Navigate to="/inteligencia?tab=ai" replace />} />
    <Route path="/analytics" element={<Navigate to="/inteligencia?tab=analise" replace />} />
    <Route path="/bi" element={<Navigate to="/inteligencia?tab=analise" replace />} />

    {/* Google AI Suite */}
    <Route
      path="/ai/clinical"
      element={
        <ProtectedRoute>
          <ClinicalAnalysisPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/ai/dicom"
      element={
        <ProtectedRoute>
          <Navigate to="/biomechanics" replace />
        </ProtectedRoute>
      }
    />
    <Route
      path="/ai/movement"
      element={
        <ProtectedRoute>
          <Navigate to="/biomechanics" replace />
        </ProtectedRoute>
      }
    />
    <Route
      path="/ai/scanner"
      element={
        <ProtectedRoute>
          <DocumentScannerPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/ai/activity-lab"
      element={
        <ProtectedRoute>
          <ActivityLabPage />
        </ProtectedRoute>
      }
    />

    {/* AI Tools */}
    <Route
      path="/chatbot"
      element={
        <ProtectedRoute>
          <MainLayout>
            <MedicalChatbot userId="system" />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/computer-vision/:patientId?"
      element={
        <ProtectedRoute>
          <MainLayout>
            <ComputerVisionExercise />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/intelligent-reports/:patientId"
      element={
        <ProtectedRoute>
          <IntelligentReportsRoute />
        </ProtectedRoute>
      }
    />
    <Route
      path="/augmented-reality/:patientId?"
      element={
        <ProtectedRoute>
          <MainLayout>
            <AugmentedRealityExercise />
          </MainLayout>
        </ProtectedRoute>
      }
    />

    {/* Image Analysis Module (NeuroPose) */}
    <Route
      path="/dashboard/imagens"
      element={
        <ProtectedRoute>
          <ImageAnalysisDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/pacientes/:id/imagens"
      element={
        <ProtectedRoute>
          <ImageAnalysisDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/dinamica/:id"
      element={
        <ProtectedRoute>
          <DynamicCompareDetailsPage />
        </ProtectedRoute>
      }
    />
  </>
);
