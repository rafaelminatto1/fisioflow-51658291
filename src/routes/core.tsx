/**
 * FisioFlow - Rotas do Núcleo Principal
 * @module routes/core
 */

import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/error";
import { PageLayout } from "@/components/layout/PageLayout";

const GoogleCallback = lazy(
  () => import(/* webpackChunkName: "google-callback" */ "@/pages/auth/GoogleCallback"),
);

// Lazy loads - Core pages
const Schedule = lazy(() => import(/* webpackChunkName: "schedule" */ "@/pages/Schedule"));
const Index = lazy(() => import(/* webpackChunkName: "dashboard" */ "@/pages/Index"));
const Patients = lazy(() => import(/* webpackChunkName: "patients" */ "@/pages/Patients"));
const Exercises = lazy(() => import(/* webpackChunkName: "exercises" */ "@/pages/Exercises"));
// Exercises sub-pages (children of /exercises layout route via <Outlet/> in Exercises.tsx)
const ExercisesLibraryPage = lazy(
  () => import(/* webpackChunkName: "exercises-library" */ "@/pages/exercises/ExercisesLibraryPage"),
);
const ExerciseVideosPage = lazy(
  () => import(/* webpackChunkName: "exercise-videos" */ "@/pages/exercises/ExerciseVideosPage"),
);
const ExerciseTemplatesPage = lazy(
  () => import(/* webpackChunkName: "exercise-templates" */ "@/pages/exercises/ExerciseTemplatesPage"),
);
const ExerciseProtocolsPage = lazy(
  () => import(/* webpackChunkName: "exercise-protocols" */ "@/pages/exercises/ExerciseProtocolsPage"),
);
const ExerciseAiPage = lazy(
  () => import(/* webpackChunkName: "exercise-ai" */ "@/pages/exercises/ExerciseAiPage"),
);
const ExerciseAnalyticsPage = lazy(
  () => import(/* webpackChunkName: "exercise-analytics" */ "@/pages/exercises/ExerciseAnalyticsPage"),
);
const ExercisesLegacyRedirect = lazy(() =>
  import(/* webpackChunkName: "exercises-legacy-redirect" */ "@/pages/exercises/ExercisesLegacyRedirect"),
);
const Financial = lazy(() => import(/* webpackChunkName: "financial" */ "@/pages/Financial"));
const Reports = lazy(() => import(/* webpackChunkName: "reports" */ "@/pages/Reports"));
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ "@/pages/Settings"));
const Profile = lazy(() =>
  import(/* webpackChunkName: "profile" */ "@/pages/Profile").then((module) => ({
    default: module.Profile,
  })),
);
const Communications = lazy(
  () => import(/* webpackChunkName: "communications" */ "@/pages/Communications"),
);
const ProtocolsPage = lazy(() => import(/* webpackChunkName: "protocols" */ "@/pages/Protocols"));
const Templates = lazy(() => import(/* webpackChunkName: "templates" */ "@/pages/Templates"));
const NewTemplatePage = lazy(
  () => import(/* webpackChunkName: "template-builder" */ "@/pages/templates/NewTemplatePage"),
);
const EditTemplatePage = lazy(
  () => import(/* webpackChunkName: "template-builder" */ "@/pages/templates/EditTemplatePage"),
);
const AutomationBuilder = lazy(
  () => import(/* webpackChunkName: "automation-builder" */ "@/pages/automations/AutomationBuilderPage"),
);
const AutomationsDashboard = lazy(
  () => import(/* webpackChunkName: "automations-dashboard" */ "@/pages/automations/AutomationsDashboardPage"),
);
const AutomationTemplates = lazy(
  () => import(/* webpackChunkName: "automation-templates" */ "@/pages/automations/AutomationTemplatesPage"),
);
const CopilotChat = lazy(
  () => import(/* webpackChunkName: "copilot-chat" */ "@/pages/copilot/CopilotChatPage"),
);
const EventMonitor = lazy(
  () => import(/* webpackChunkName: "event-monitor" */ "@/pages/events/EventMonitorPage"),
);
const BriefingDashboard = lazy(
  () => import(/* webpackChunkName: "briefing-dashboard" */ "@/pages/briefing/BriefingDashboardPage"),
);
const SemanticExerciseSearch = lazy(
  () => import(/* webpackChunkName: "semantic-exercise-search" */ "@/pages/exercises/SemanticExerciseSearch"),
);
const ExerciseCuration = lazy(
  () => import(/* webpackChunkName: "exercise-curation" */ "@/pages/exercises/ExerciseCuration"),
);
const ExerciseEvidence = lazy(
  () => import(/* webpackChunkName: "exercise-evidence" */ "@/pages/exercises/ExerciseEvidence"),
);
const KnowledgeAsk = lazy(
  () => import(/* webpackChunkName: "knowledge-ask" */ "@/pages/knowledge/KnowledgeAsk"),
);
const EvolucaoClinica = lazy(
  () => import(/* webpackChunkName: "evolucao-clinica" */ "@/pages/EvolucaoClinica"),
);
const AvaliacaoInicial = lazy(
  () => import(/* webpackChunkName: "avaliacao-inicial" */ "@/pages/AvaliacaoInicial"),
);

const semanticExerciseSearchElement = (
  <RouteErrorBoundary routeName="SemanticExerciseSearch">
    <ProtectedRoute>
      <PageLayout noPadding>
        <SemanticExerciseSearch />
      </PageLayout>
    </ProtectedRoute>
  </RouteErrorBoundary>
);

const exerciseCurationElement = (
  <RouteErrorBoundary routeName="ExerciseCuration">
    <ProtectedRoute>
      <PageLayout noPadding>
        <ExerciseCuration />
      </PageLayout>
    </ProtectedRoute>
  </RouteErrorBoundary>
);

const exerciseEvidenceElement = (
  <RouteErrorBoundary routeName="ExerciseEvidence">
    <ProtectedRoute>
      <PageLayout noPadding>
        <ExerciseEvidence />
      </PageLayout>
    </ProtectedRoute>
  </RouteErrorBoundary>
);

export const coreRoutes = (
  <>
    {/* Public OAuth callbacks */}
    <Route path="/auth/google/callback" element={<GoogleCallback />} />

    {/* Redirects */}
    <Route path="/" element={<Navigate to="/agenda" replace />} />
    <Route path="/calendar" element={<Navigate to="/agenda" replace />} />
    <Route path="/pacientes" element={<Navigate to="/patients" replace />} />
    <Route path="/schedule" element={<Navigate to="/agenda" replace />} />
    <Route path="/login" element={<Navigate to="/auth" replace />} />
    <Route path="/perfil" element={<Navigate to="/profile" replace />} />
    <Route path="/configuracoes" element={<Navigate to="/profile" replace />} />

    {/* Core protected routes */}
    <Route
      path="/agenda"
      element={
        <RouteErrorBoundary routeName="Schedule">
          <ProtectedRoute>
            <Schedule />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/dashboard"
      element={
        <RouteErrorBoundary routeName="Dashboard">
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/patients"
      element={
        <RouteErrorBoundary routeName="Patients">
          <ProtectedRoute>
            <Patients />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/exercises"
      element={
        <RouteErrorBoundary routeName="Exercises">
          <ProtectedRoute>
            <Exercises />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    >
      <Route index element={<ExercisesLibraryPage />} />
      <Route path="videos" element={<ExerciseVideosPage />} />
      <Route path="templates" element={<ExerciseTemplatesPage />} />
      <Route path="protocols" element={<ExerciseProtocolsPage />} />
      <Route path="ai" element={<ExerciseAiPage />} />
      <Route path="analytics" element={<ExerciseAnalyticsPage />} />
    </Route>
    <Route
      path="/automacoes"
      element={
        <RouteErrorBoundary routeName="AutomationsDashboard">
          <ProtectedRoute>
            <AutomationsDashboard />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/automacoes/templates"
      element={
        <RouteErrorBoundary routeName="AutomationTemplates">
          <ProtectedRoute>
            <AutomationTemplates />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/automacoes/builder/new"
      element={
        <RouteErrorBoundary routeName="AutomationBuilder">
          <ProtectedRoute>
            <PageLayout fullWidth noPadding>
              <AutomationBuilder />
            </PageLayout>
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/automacoes/builder/:id"
      element={
        <RouteErrorBoundary routeName="AutomationBuilder">
          <ProtectedRoute>
            <PageLayout fullWidth noPadding>
              <AutomationBuilder />
            </PageLayout>
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/copiloto"
      element={
        <RouteErrorBoundary routeName="CopilotChat">
          <ProtectedRoute>
            <PageLayout fullWidth noPadding>
              <CopilotChat />
            </PageLayout>
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/monitor"
      element={
        <RouteErrorBoundary routeName="EventMonitor">
          <ProtectedRoute>
            <PageLayout noPadding>
              <EventMonitor />
            </PageLayout>
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/briefing"
      element={
        <RouteErrorBoundary routeName="BriefingDashboard">
          <ProtectedRoute>
            <PageLayout noPadding>
              <BriefingDashboard />
            </PageLayout>
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route path="/exercises/search-ai" element={semanticExerciseSearchElement} />
    <Route path="/exercicios/busca-ia" element={semanticExerciseSearchElement} />
    <Route path="/exercises/curation" element={exerciseCurationElement} />
    <Route path="/exercicios/curadoria" element={exerciseCurationElement} />
    <Route path="/exercises/:id/evidence" element={exerciseEvidenceElement} />
    <Route path="/exercicios/:id/evidencia" element={exerciseEvidenceElement} />
    {/* Legacy PT exercise routes — redirect to EN equivalents */}
    <Route path="/exercicios" element={<ExercisesLegacyRedirect />} />
    <Route path="/exercicios/videos" element={<ExercisesLegacyRedirect />} />
    <Route path="/exercicios/templates" element={<ExercisesLegacyRedirect />} />
    <Route path="/exercicios/protocolos" element={<ExercisesLegacyRedirect />} />
    <Route path="/exercicios/ia" element={<ExercisesLegacyRedirect />} />
    <Route path="/exercicios/analytics" element={<ExercisesLegacyRedirect />} />
    <Route
      path="/base-conhecimento"
      element={
        <RouteErrorBoundary routeName="KnowledgeAsk">
          <ProtectedRoute>
            <PageLayout noPadding>
              <KnowledgeAsk />
            </PageLayout>
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/protocols"
      element={
        <ProtectedRoute>
          <ProtocolsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/protocols/:id"
      element={
        <ProtectedRoute>
          <ProtocolsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/templates"
      element={
        <ProtectedRoute>
          <Templates />
        </ProtectedRoute>
      }
    />
    <Route
      path="/templates/new"
      element={
        <ProtectedRoute>
          <NewTemplatePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/templates/:id/edit"
      element={
        <ProtectedRoute>
          <EditTemplatePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/financial"
      element={
        <RouteErrorBoundary routeName="Financial">
          <ProtectedRoute>
            <Financial />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/reports"
      element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      }
    />
    <Route path="/settings" element={<Settings />} />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/communications"
      element={
        <RouteErrorBoundary routeName="Communications">
          <ProtectedRoute>
            <Communications />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/evolucao-clinica"
      element={
        <RouteErrorBoundary routeName="EvolucaoClinica">
          <ProtectedRoute>
            <EvolucaoClinica />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/avaliacao-inicial"
      element={
        <RouteErrorBoundary routeName="AvaliacaoInicial">
          <ProtectedRoute>
            <AvaliacaoInicial />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
  </>
);
