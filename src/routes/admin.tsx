/**
 * FisioFlow - Rotas de Administração
 * @module routes/admin
 */

import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy loads - Admin
const UserManagement = lazy(
  () => import(/* webpackChunkName: "admin-users" */ "@/pages/UserManagement"),
);
const AuditLogs = lazy(() => import(/* webpackChunkName: "admin-audit" */ "@/pages/AuditLogs"));
const SecurityMonitoring = lazy(
  () => import(/* webpackChunkName: "admin-security" */ "@/pages/SecurityMonitoring"),
);
const SecuritySettings = lazy(
  () => import(/* webpackChunkName: "settings-security" */ "@/pages/SecuritySettings"),
);
const AdminCRUD = lazy(() => import(/* webpackChunkName: "admin-crud" */ "@/pages/AdminCRUD"));
const Admin = lazy(() => import(/* webpackChunkName: "admin-analytics" */ "@/pages/Admin"));
const AdvancedAnalytics = lazy(
  () => import(/* webpackChunkName: "analytics-advanced" */ "@/pages/AdvancedAnalytics"),
);
const CohortAnalysis = lazy(
  () => import(/* webpackChunkName: "analytics-cohorts" */ "@/pages/CohortAnalysis"),
);
const PreCadastroAdmin = lazy(
  () => import(/* webpackChunkName: "pre-cadastro-admin" */ "@/pages/PreCadastroAdmin"),
);
const ProfessionalManagement = lazy(
  () =>
    import(/* webpackChunkName: "admin-professionals" */ "@/pages/admin/ProfessionalManagement"),
);

// Goals Admin
const GoalProfileListPage = lazy(
  () => import(/* webpackChunkName: "goals-list" */ "@/pages/admin/goals/GoalProfileListPage"),
);
const GoalProfileEditorPage = lazy(
  () => import(/* webpackChunkName: "goals-editor" */ "@/pages/admin/goals/GoalProfileEditorPage"),
);

// Gamification Admin
const AdminGamificationPage = lazy(
  () =>
    import(
      /* webpackChunkName: "gamification-admin" */ "@/pages/admin/gamification/AdminGamificationPage"
    ),
);

export const adminRoutes = (
  <>
    {/* Admin - Requires admin role */}
    <Route
      path="/admin/users"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <UserManagement />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/audit-logs"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AuditLogs />
        </ProtectedRoute>
      }
    />
    <Route path="/admin/invitations" element={<Navigate to="/admin/users" replace />} />
    <Route
      path="/admin/security"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <SecurityMonitoring />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/crud"
      element={
        <ProtectedRoute allowedRoles={["admin", "fisioterapeuta"]}>
          <AdminCRUD />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/organization"
      element={<Navigate to="/settings?tab=organization" replace />}
    />
    <Route
      path="/admin/analytics"
      element={
        <ProtectedRoute allowedRoles={["admin", "fisioterapeuta"]}>
          <Admin />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/cohorts"
      element={
        <ProtectedRoute allowedRoles={["admin", "fisioterapeuta"]}>
          <CohortAnalysis />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/goals"
      element={
        <ProtectedRoute allowedRoles={["admin", "fisioterapeuta"]}>
          <GoalProfileListPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/goals/:id"
      element={
        <ProtectedRoute allowedRoles={["admin", "fisioterapeuta"]}>
          <GoalProfileEditorPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/gamification"
      element={
        <ProtectedRoute allowedRoles={["admin", "fisioterapeuta"]}>
          <AdminGamificationPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/professionals"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <ProfessionalManagement />
        </ProtectedRoute>
      }
    />

    {/* Security Settings */}
    <Route
      path="/security-settings"
      element={
        <ProtectedRoute>
          <SecuritySettings />
        </ProtectedRoute>
      }
    />
    <Route
      path="/security-monitoring"
      element={
        <ProtectedRoute>
          <SecurityMonitoring />
        </ProtectedRoute>
      }
    />

    {/* Pre-cadastro Admin */}
    <Route
      path="/pre-cadastro-admin"
      element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <PreCadastroAdmin />
        </ProtectedRoute>
      }
    />

    {/* Analytics */}
    <Route
      path="/analytics"
      element={
        <ProtectedRoute>
          <AdvancedAnalytics />
        </ProtectedRoute>
      }
    />
  </>
);
