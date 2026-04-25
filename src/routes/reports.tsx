/**
 * FisioFlow - Rotas de Relatórios
 * @module routes/reports
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy loads - Relatórios
const AniversariantesPage = lazy(
  () =>
    import(/* webpackChunkName: "reports-birthdays" */ "@/pages/relatorios/AniversariantesPage"),
);
const AttendanceReport = lazy(
  () => import(/* webpackChunkName: "reports-attendance" */ "@/pages/relatorios/AttendanceReport"),
);
const TeamPerformance = lazy(
  () => import(/* webpackChunkName: "reports-team" */ "@/pages/relatorios/TeamPerformance"),
);
const RelatorioMedicoPage = lazy(
  () => import(/* webpackChunkName: "reports-medico" */ "@/pages/relatorios/RelatorioMedicoPage"),
);
const RelatorioConvenioPage = lazy(
  () =>
    import(/* webpackChunkName: "reports-convenio" */ "@/pages/relatorios/RelatorioConvenioPage"),
);

export const reportsRoutes = (
  <>
    <Route
      path="/relatorios/aniversariantes"
      element={
        <ProtectedRoute>
          <AniversariantesPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/relatorios/comparecimento"
      element={
        <ProtectedRoute>
          <AttendanceReport />
        </ProtectedRoute>
      }
    />
    <Route
      path="/relatorios/medico"
      element={
        <ProtectedRoute>
          <RelatorioMedicoPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/relatorios/convenio"
      element={
        <ProtectedRoute>
          <RelatorioConvenioPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/performance-equipe"
      element={
        <ProtectedRoute>
          <TeamPerformance />
        </ProtectedRoute>
      }
    />
  </>
);
