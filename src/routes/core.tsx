/**
 * FisioFlow - Rotas do Núcleo Principal
 * @module routes/core
 */

import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/error";

const GoogleCallback = lazy(
  () => import(/* webpackChunkName: "google-callback" */ "@/pages/auth/GoogleCallback"),
);

// Lazy loads - Core pages
const Schedule = lazy(() => import(/* webpackChunkName: "schedule" */ "@/pages/Schedule"));
const Index = lazy(() => import(/* webpackChunkName: "dashboard" */ "@/pages/Index"));
const Patients = lazy(() => import(/* webpackChunkName: "patients" */ "@/pages/Patients"));
const Exercises = lazy(() => import(/* webpackChunkName: "exercises" */ "@/pages/Exercises"));
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
const CopilotChat = lazy(
  () => import(/* webpackChunkName: "copilot-chat" */ "@/pages/copilot/CopilotChatPage"),
);
const EventMonitor = lazy(
  () => import(/* webpackChunkName: "event-monitor" */ "@/pages/events/EventMonitorPage"),
);
const BriefingDashboard = lazy(
  () => import(/* webpackChunkName: "briefing-dashboard" */ "@/pages/briefing/BriefingDashboardPage"),
);
const BlocksEditorDemo = lazy(
  () => import(/* webpackChunkName: "blocks-editor-demo" */ "@/pages/evolution/BlocksEditorDemo"),
);
const SemanticExerciseSearch = lazy(
  () => import(/* webpackChunkName: "semantic-exercise-search" */ "@/pages/exercises/SemanticExerciseSearch"),
);
const ExerciseCuration = lazy(
  () => import(/* webpackChunkName: "exercise-curation" */ "@/pages/exercises/ExerciseCuration"),
);
const EvolucaoClinica = lazy(
  () => import(/* webpackChunkName: "evolucao-clinica" */ "@/pages/EvolucaoClinica"),
);
const AvaliacaoInicial = lazy(
  () => import(/* webpackChunkName: "avaliacao-inicial" */ "@/pages/AvaliacaoInicial"),
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
    />
    <Route
      path="/automacoes"
      element={
        <RouteErrorBoundary routeName="AutomationBuilder">
          <ProtectedRoute>
            <AutomationBuilder />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/copiloto"
      element={
        <RouteErrorBoundary routeName="CopilotChat">
          <ProtectedRoute>
            <CopilotChat />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/monitor"
      element={
        <RouteErrorBoundary routeName="EventMonitor">
          <ProtectedRoute>
            <EventMonitor />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/briefing"
      element={
        <RouteErrorBoundary routeName="BriefingDashboard">
          <ProtectedRoute>
            <BriefingDashboard />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/editor-blocos"
      element={
        <RouteErrorBoundary routeName="BlocksEditorDemo">
          <ProtectedRoute>
            <BlocksEditorDemo />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/exercicios/busca-ia"
      element={
        <RouteErrorBoundary routeName="SemanticExerciseSearch">
          <ProtectedRoute>
            <SemanticExerciseSearch />
          </ProtectedRoute>
        </RouteErrorBoundary>
      }
    />
    <Route
      path="/exercicios/curadoria"
      element={
        <RouteErrorBoundary routeName="ExerciseCuration">
          <ProtectedRoute>
            <ExerciseCuration />
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
