import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const WhatsAppInboxPage = lazy(
  () => import(/* webpackChunkName: "whatsapp-inbox" */ "@/pages/WhatsAppInbox"),
);
const WhatsAppDashboardPage = lazy(
  () => import(/* webpackChunkName: "whatsapp-dashboard" */ "@/pages/WhatsAppDashboard"),
);
const WhatsAppAutomationsPage = lazy(
  () => import(/* webpackChunkName: "whatsapp-automations" */ "@/pages/WhatsAppAutomations"),
);
const WhatsAppTemplatesPage = lazy(
  () => import(/* webpackChunkName: "whatsapp-templates" */ "@/pages/WhatsAppTemplates"),
);

export const whatsappRoutes = (
  <>
    <Route
      path="/whatsapp/inbox"
      element={
        <ProtectedRoute>
          <WhatsAppInboxPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/whatsapp/dashboard"
      element={
        <ProtectedRoute>
          <WhatsAppDashboardPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/whatsapp/automations"
      element={
        <ProtectedRoute>
          <WhatsAppAutomationsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/whatsapp/templates"
      element={
        <ProtectedRoute>
          <WhatsAppTemplatesPage />
        </ProtectedRoute>
      }
    />
  </>
);
