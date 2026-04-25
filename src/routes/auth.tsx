/**
 * FisioFlow - Rotas de Autenticação
 * @module routes/auth
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy loads
const Welcome = lazy(() => import(/* webpackChunkName: "auth-welcome" */ "@/pages/Welcome"));
const Auth = lazy(() => import(/* webpackChunkName: "auth" */ "@/pages/Auth"));
const PendingApproval = lazy(
  () => import(/* webpackChunkName: "auth-pending" */ "@/pages/PendingApproval"),
);
const PreCadastro = lazy(
  () => import(/* webpackChunkName: "pre-cadastro" */ "@/pages/PreCadastro"),
);
const FeedbackPreCadastro = lazy(
  () => import(/* webpackChunkName: "feedback-pre-cadastro" */ "@/pages/FeedbackPreCadastro"),
);

export const authRoutes = (
  <>
    {/* Public routes */}
    <Route path="/welcome" element={<Welcome />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/auth/login" element={<Auth />} />
    <Route
      path="/pending-approval"
      element={
        <ProtectedRoute>
          <PendingApproval />
        </ProtectedRoute>
      }
    />
    <Route path="/pre-cadastro" element={<PreCadastro />} />
    <Route path="/pre-cadastro/:token" element={<PreCadastro />} />
    <Route path="/feedback-pre-cadastro" element={<FeedbackPreCadastro />} />
  </>
);
