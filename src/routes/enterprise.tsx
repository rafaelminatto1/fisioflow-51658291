/**
 * FisioFlow - Rotas Enterprise (Features Avançadas)
 * @module routes/enterprise
 */

import { lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { WikiLayout, WikiDashboard } from '@/features/wiki';

// Lazy loads - Enterprise Features
const TimeTracking = lazy(() => import(/* webpackChunkName: "timetracking" */ "@/pages/TimeTracking"));
const Automation = lazy(() => import(/* webpackChunkName: "automation" */ "@/pages/Automation"));
const Integrations = lazy(() => import(/* webpackChunkName: "integrations" */ "@/pages/Integrations"));
const WikiWorkspacePage = lazy(() => import(/* webpackChunkName: "wiki" */ "@/pages/Wiki"));
const TemplateAnalyticsPage = lazy(() => import(/* webpackChunkName: "wiki-template-analytics" */ "@/features/wiki/pages/TemplateAnalyticsPage"));

// Projects
const Projects = lazy(() => import(/* webpackChunkName: "projects" */ "@/pages/Projects"));
const ProjectDetails = lazy(() => import(/* webpackChunkName: "project-details" */ "@/pages/ProjectDetails"));

// Tasks
const TarefasV2 = lazy(() => import(/* webpackChunkName: "tasks-v2" */ "@/pages/TarefasV2"));

// Clinical
const ClinicalTestsLibrary = lazy(() => import(/* webpackChunkName: "clinical-tests" */ "@/pages/ClinicalTestsLibrary"));
const TherapistOccupancy = lazy(() => import(/* webpackChunkName: "occupancy" */ "@/pages/TherapistOccupancy"));

// Events
const Eventos = lazy(() => import(/* webpackChunkName: "events" */ "@/pages/Eventos"));
const EventoDetalhes = lazy(() => import(/* webpackChunkName: "events-detail" */ "@/pages/EventoDetalhes"));
const EventosAnalytics = lazy(() => import(/* webpackChunkName: "events-analytics" */ "@/pages/EventosAnalytics"));

// Vouchers & Partner
const Partner = lazy(() => import(/* webpackChunkName: "vouchers-partners" */ "@/pages/Partner"));
const Vouchers = lazy(() => import(/* webpackChunkName: "vouchers" */ "@/pages/Vouchers"));

// Misc
const Surveys = lazy(() => import(/* webpackChunkName: "surveys" */ "@/pages/Surveys"));
const Inventory = lazy(() => import(/* webpackChunkName: "inventory" */ "@/pages/Inventory"));
const Notifications = lazy(() => import(/* webpackChunkName: "notifications" */ "@/pages/Notifications"));

// Physiotherapy
const PhysiotherapyHub = lazy(() => import(/* webpackChunkName: "physiotherapy" */ "@/pages/PhysiotherapyHub"));
const Telemedicine = lazy(() => import(/* webpackChunkName: "telemedicine" */ "@/pages/Telemedicine"));
const TelemedicineRoom = lazy(() => import(/* webpackChunkName: "telemedicine-room" */ "@/pages/TelemedicineRoom"));
const ExerciseLibraryExpanded = lazy(() => import(/* webpackChunkName: "exercises-library" */ "@/pages/ExerciseLibraryExpanded"));
const Biofeedback = lazy(() => import(/* webpackChunkName: "biofeedback" */ "@/pages/Biofeedback"));

// CRM
const CRMDashboard = lazy(() => import(/* webpackChunkName: "crm-dashboard" */ "@/pages/crm/CRMDashboard"));

// Communications
const Communications = lazy(() => import(/* webpackChunkName: "communications" */ "@/pages/Communications"));
const EmailTest = lazy(() => import(/* webpackChunkName: "email-test" */ "@/pages/communications/EmailTest"));

// Settings
const ScheduleSettings = lazy(() => import(/* webpackChunkName: "settings-schedule" */ "@/pages/ScheduleSettings"));
const CalendarSettings = lazy(() => import(/* webpackChunkName: "settings-calendar" */ "@/pages/configuracoes/CalendarSettings"));

export const enterpriseRoutes = (
  <>
    {/* Tasks */}
    <Route path="/tarefas" element={<Navigate to="/tarefas-v2" replace />} />
    <Route path="/tarefas-v2" element={<ProtectedRoute><TarefasV2 /></ProtectedRoute>} />
    
    {/* Enterprise Features */}
    <Route path="/timetracking" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
    <Route path="/automation" element={<ProtectedRoute><Automation /></ProtectedRoute>} />
    <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
    
    {/* Wiki */}
    <Route path="/wiki/template-analytics" element={<ProtectedRoute><TemplateAnalyticsPage /></ProtectedRoute>} />
    <Route path="/wiki/:slug?" element={<ProtectedRoute><WikiWorkspacePage /></ProtectedRoute>} />
    <Route
        path="/wiki-hub/*"
        element={
            <ProtectedRoute>
                <WikiLayout>
                    <Routes>
                        <Route index element={<WikiDashboard />} />
                    </Routes>
                </WikiLayout>
            </ProtectedRoute>
        }
    />
    
    {/* Projects */}
    <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
    <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
    
    {/* Clinical */}
    <Route path="/clinical-tests" element={<ProtectedRoute><ClinicalTestsLibrary /></ProtectedRoute>} />
    <Route path="/ocupacao-fisioterapeutas" element={<ProtectedRoute><TherapistOccupancy /></ProtectedRoute>} />
    
    {/* Events */}
    <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
    <Route path="/eventos/analytics" element={<ProtectedRoute><EventosAnalytics /></ProtectedRoute>} />
    <Route path="/eventos/:id" element={<ProtectedRoute><EventoDetalhes /></ProtectedRoute>} />
    
    {/* Vouchers & Partner */}
    <Route path="/partner" element={<ProtectedRoute><Partner /></ProtectedRoute>} />
    <Route path="/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
    
    {/* Misc */}
    <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
    <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
    
    {/* Physiotherapy */}
    <Route path="/physiotherapy" element={<ProtectedRoute><PhysiotherapyHub /></ProtectedRoute>} />
    <Route path="/telemedicine" element={<ProtectedRoute><Telemedicine /></ProtectedRoute>} />
    <Route path="/telemedicine-room/:roomId" element={<ProtectedRoute><TelemedicineRoom /></ProtectedRoute>} />
    <Route path="/exercise-library" element={<ProtectedRoute><ExerciseLibraryExpanded /></ProtectedRoute>} />
    <Route path="/biofeedback" element={<ProtectedRoute><Biofeedback /></ProtectedRoute>} />
    
    {/* CRM */}
    <Route path="/crm" element={<ProtectedRoute><CRMDashboard /></ProtectedRoute>} />
    <Route path="/crm/leads" element={<Navigate to="/crm" replace />} />
    <Route path="/crm/campanhas" element={<Navigate to="/crm" replace />} />
    
    {/* Communications */}
    <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
    <Route path="/communications/email-test" element={<ProtectedRoute><EmailTest /></ProtectedRoute>} />
    
    {/* Settings */}
    <Route path="/agenda/settings" element={<ProtectedRoute><ScheduleSettings /></ProtectedRoute>} />
    <Route path="/schedule/settings" element={<Navigate to="/agenda/settings" replace />} />
    <Route path="/configuracoes/calendario" element={<ProtectedRoute><CalendarSettings /></ProtectedRoute>} />
  </>
);