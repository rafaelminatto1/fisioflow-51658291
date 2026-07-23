import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const WhatsAppDashboardPage = lazy(
  () => import(/* webpackChunkName: "whatsapp-dashboard" */ "@/pages/WhatsAppDashboard"),
);
const WhatsAppAutomationsPage = lazy(
  () => import(/* webpackChunkName: "whatsapp-automations" */ "@/pages/WhatsAppAutomations"),
);
const WhatsAppTemplatesPage = lazy(
  () => import(/* webpackChunkName: "whatsapp-templates" */ "@/pages/WhatsAppTemplates"),
);
const CrmWhatsAppPage = lazy(
  () => import(/* webpackChunkName: "crm-whatsapp" */ "@/pages/CrmWhatsApp"),
);
const CrmWhatsAppSettingsPage = lazy(
  () => import(/* webpackChunkName: "crm-whatsapp-settings" */ "@/pages/CrmWhatsAppSettings"),
);

export const whatsappRoutes = (
  <>
    <Route
      path="/crm-whatsapp"
      element={
        <ProtectedRoute allowedRoles={["admin", "recepcionista"]}>
          <CrmWhatsAppPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/crm-whatsapp/configuracoes"
      element={
        <ProtectedRoute allowedRoles={["admin", "recepcionista"]}>
          <CrmWhatsAppSettingsPage />
        </ProtectedRoute>
      }
    />
    <Route path="/whatsapp/inbox" element={<Navigate to="/crm-whatsapp" replace />} />
    <Route
      path="/whatsapp/dashboard"
      element={
        <ProtectedRoute allowedRoles={["admin", "recepcionista"]}>
          <WhatsAppDashboardPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/whatsapp/automations"
      element={
        <ProtectedRoute allowedRoles={["admin", "recepcionista"]}>
          <WhatsAppAutomationsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/whatsapp/templates"
      element={
        <ProtectedRoute allowedRoles={["admin", "recepcionista"]}>
          <WhatsAppTemplatesPage />
        </ProtectedRoute>
      }
    />
  </>
);
