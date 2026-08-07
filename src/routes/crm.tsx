import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const CRMLayout = lazy(
  () => import(/* webpackChunkName: "crm-layout" */ "@/pages/crm/CRMLayout"),
);
const CRMPipelinePage = lazy(
  () => import(/* webpackChunkName: "crm-pipeline" */ "@/pages/crm/CRMPipelinePage"),
);
const CRMInboxPage = lazy(
  () => import(/* webpackChunkName: "crm-inbox" */ "@/pages/crm/CRMInboxPage"),
);
const CRMTasksPage = lazy(
  () => import(/* webpackChunkName: "crm-tasks" */ "@/pages/crm/CRMTasksPage"),
);
const CRMAutomationsPage = lazy(
  () => import(/* webpackChunkName: "crm-automations" */ "@/pages/crm/CRMAutomationsPage"),
);
const CRMAnalyticsPage = lazy(
  () => import(/* webpackChunkName: "crm-analytics" */ "@/pages/crm/CRMAnalyticsPage"),
);
const CRMCampaignsPage = lazy(
  () => import(/* webpackChunkName: "crm-campaigns" */ "@/pages/crm/CRMCampaignsPage"),
);

export const crmRoutes = (
  <Route
    path="/crm"
    element={
      <ProtectedRoute allowedRoles={["admin", "recepcionista"]}>
        <CRMLayout />
      </ProtectedRoute>
    }
  >
    <Route index element={<Navigate to="/crm/pipeline" replace />} />
    <Route path="pipeline" element={<CRMPipelinePage />} />
    <Route path="inbox" element={<CRMInboxPage />} />
    <Route path="tasks" element={<CRMTasksPage />} />
    <Route path="automations" element={<CRMAutomationsPage />} />
    <Route path="analytics" element={<CRMAnalyticsPage />} />
    <Route path="campaigns" element={<CRMCampaignsPage />} />
  </Route>
);
