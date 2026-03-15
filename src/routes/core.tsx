/**
 * FisioFlow - Rotas do Núcleo Principal
 * @module routes/core
 */

import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RouteErrorBoundary } from '@/components/error-boundaries/RouteErrorBoundary';

// Lazy loads - Core pages
const Index = lazy(() => import(/* webpackChunkName: "dashboard" */ "@/pages/Index"));
const Schedule = lazy(() => import(/* webpackChunkName: "schedule" */ "@/pages/Schedule"));
const Patients = lazy(() => import(/* webpackChunkName: "patients" */ "@/pages/Patients"));
const Exercises = lazy(() => import(/* webpackChunkName: "exercises" */ "@/pages/Exercises"));
const Financial = lazy(() => import(/* webpackChunkName: "financial" */ "@/pages/Financial"));
const Reports = lazy(() => import(/* webpackChunkName: "reports" */ "@/pages/Reports"));
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ "@/pages/Settings"));
const Profile = lazy(() => import(/* webpackChunkName: "profile" */ "@/pages/Profile").then(module => ({ default: module.Profile })));
const Communications = lazy(() => import(/* webpackChunkName: "communications" */ "@/pages/Communications"));
const ProtocolsPage = lazy(() => import(/* webpackChunkName: "protocols" */ "@/pages/Protocols"));

export const coreRoutes = (
  <>
    {/* Redirects */}
    <Route path="/" element={<Navigate to="/agenda" replace />} />
    <Route path="/calendar" element={<Navigate to="/agenda" replace />} />
    <Route path="/pacientes" element={<Navigate to="/patients" replace />} />
    <Route path="/schedule" element={<Navigate to="/agenda" replace />} />
    <Route path="/login" element={<Navigate to="/auth" replace />} />
    <Route path="/perfil" element={<Navigate to="/profile" replace />} />
    <Route path="/configuracoes" element={<Navigate to="/settings" replace />} />

    {/* Core protected routes */}
    <Route path="/agenda" element={
      <RouteErrorBoundary routeName="Schedule">
        <ProtectedRoute><Schedule /></ProtectedRoute>
      </RouteErrorBoundary>
    } />
    <Route path="/dashboard" element={
      <RouteErrorBoundary routeName="Dashboard">
        <ProtectedRoute><Index /></ProtectedRoute>
      </RouteErrorBoundary>
    } />
    <Route path="/patients" element={
      <RouteErrorBoundary routeName="Patients">
        <ProtectedRoute><Patients /></ProtectedRoute>
      </RouteErrorBoundary>
    } />
    <Route path="/exercises" element={
      <RouteErrorBoundary routeName="Exercises">
        <ProtectedRoute><Exercises /></ProtectedRoute>
      </RouteErrorBoundary>
    } />
    <Route path="/protocols" element={<ProtectedRoute><ProtocolsPage /></ProtectedRoute>} />
    <Route path="/financial" element={
      <RouteErrorBoundary routeName="Financial">
        <ProtectedRoute><Financial /></ProtectedRoute>
      </RouteErrorBoundary>
    } />
    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
  </>
);