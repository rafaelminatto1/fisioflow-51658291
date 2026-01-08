import React, { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { AuthContextProvider } from "@/contexts/AuthContextProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
import { logger } from '@/lib/errors/logger';
import { notificationManager } from '@/lib/services/NotificationManager';
import { initMonitoring } from '@/lib/monitoring';

// Lazy load pages for better performance
const Welcome = lazy(() => import("./pages/Welcome"));
const Auth = lazy(() => import("./pages/Auth"));

const Index = lazy(() => import("./pages/Index"));
const Patients = lazy(() => import("./pages/Patients"));
const Schedule = lazy(() => import("./pages/Schedule"));
const ScheduleSettings = lazy(() => import("./pages/ScheduleSettings"));
const Exercises = lazy(() => import("./pages/Exercises"));
const Financial = lazy(() => import("./pages/Financial"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile").then(module => ({ default: module.Profile })));
const MedicalRecord = lazy(() => import("./pages/MedicalRecord"));
const SmartAI = lazy(() => import("./pages/SmartAI"));
const PhysiotherapyHub = lazy(() => import("./pages/PhysiotherapyHub"));
const Telemedicine = lazy(() => import("./pages/Telemedicine"));
const ExerciseLibraryExpanded = lazy(() => import("./pages/ExerciseLibraryExpanded"));
const Biofeedback = lazy(() => import("./pages/Biofeedback"));
const PatientEvolution = lazy(() => import("./pages/PatientEvolution"));
const PatientEvolutionReport = lazy(() => import("./pages/PatientEvolutionReport"));
const Communications = lazy(() => import("./pages/Communications"));
const Partner = lazy(() => import("./pages/Partner"));
const Vouchers = lazy(() => import("./pages/Vouchers"));
const Install = lazy(() => import("./pages/Install"));
const Eventos = lazy(() => import("./pages/Eventos"));
const EventoDetalhes = lazy(() => import("./pages/EventoDetalhes"));
const EventosAnalytics = lazy(() => import("./pages/EventosAnalytics"));
const FileUploadTest = lazy(() => import("./pages/FileUploadTest"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Waitlist = lazy(() => import("./pages/Waitlist"));
const Surveys = lazy(() => import("./pages/Surveys"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const InvitationManagement = lazy(() => import("./pages/InvitationManagement"));
const SecurityMonitoring = lazy(() => import("./pages/SecurityMonitoring"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));
const AdminCRUD = lazy(() => import("./pages/AdminCRUD"));
const OrganizationSettings = lazy(() => import("./pages/OrganizationSettings"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const MedicalChatbot = lazy(() => import("./components/chatbot/MedicalChatbot"));
const ComputerVisionExercise = lazy(() => import("./components/computer-vision/ComputerVisionExercise"));
const IntelligentReports = lazy(() => import("./components/reports/IntelligentReports"));
const AugmentedRealityExercise = lazy(() => import("./components/ar/AugmentedRealityExercise"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProtocolsPage = lazy(() => import("./pages/Protocols"));
const SmartDashboard = lazy(() => import("./pages/SmartDashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const PatientGamificationPage = lazy(() => import("./pages/PatientGamificationPage"));
const NewEvaluationPage = lazy(() => import("./pages/patients/NewEvaluationPage"));
const PainMapHistoryPage = lazy(() => import("./pages/patients/PainMapHistoryPage"));
const SessionEvolutionPage = lazy(() => import("./pages/SessionEvolutionPage"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));

// Fase 2: Cadastros Gerais
const ServicosPage = lazy(() => import("./pages/cadastros/ServicosPage"));
const FornecedoresPage = lazy(() => import("./pages/cadastros/FornecedoresPage"));
const FeriadosPage = lazy(() => import("./pages/cadastros/FeriadosPage"));
const AtestadosPage = lazy(() => import("./pages/cadastros/AtestadosPage"));
const ContratosPage = lazy(() => import("./pages/cadastros/ContratosPage"));

// Fase 3: Cadastros Clínicos
const EvolutionTemplatesPage = lazy(() => import("./pages/cadastros/EvolutionTemplatesPage"));
const EvaluationFormsPage = lazy(() => import("./pages/cadastros/EvaluationFormsPage"));
const PatientObjectivesPage = lazy(() => import("./pages/cadastros/PatientObjectivesPage"));
const EvaluationFormBuilderPage = lazy(() => import("./pages/cadastros/EvaluationFormBuilderPage"));

// Fase 4: Financeiro Avançado
const ContasFinanceirasPage = lazy(() => import("./pages/financeiro/ContasFinanceirasPage"));
const FluxoCaixaPage = lazy(() => import("./pages/financeiro/FluxoCaixaPage"));

// Fase 5: Relatórios
const AniversariantesPage = lazy(() => import("./pages/relatorios/AniversariantesPage"));
const AttendanceReport = lazy(() => import("./pages/relatorios/AttendanceReport"));
const TeamPerformance = lazy(() => import("./pages/relatorios/TeamPerformance"));

const LeadsPage = lazy(() => import("./pages/crm/LeadsPage"));
const CRMDashboard = lazy(() => import("./pages/crm/CRMDashboard"));
const PatientPortal = lazy(() => import("./pages/PatientPortal"));

// Novas páginas - Fase Final
const PreCadastro = lazy(() => import("./pages/PreCadastro"));
const PreCadastroAdmin = lazy(() => import("./pages/PreCadastroAdmin"));
const TelemedicineRoom = lazy(() => import("./pages/TelemedicineRoom"));
const Notifications = lazy(() => import("./pages/Notifications"));
const TherapistOccupancy = lazy(() => import("./pages/TherapistOccupancy"));
const CalendarSettings = lazy(() => import("./pages/configuracoes/CalendarSettings"));
const PublicPrescriptionPage = lazy(() => import("./pages/prescricoes/PublicPrescriptionPage"));
const ImageAnalysisDashboard = lazy(() => import("./components/analysis/dashboard/ImageAnalysisDashboard"));
const DynamicCompareDetailsPage = lazy(() => import("./pages/dashboard/dinamica/DynamicCompareDetailsPage"));

// Goals Admin
const GoalProfileListPage = lazy(() => import("./pages/admin/goals/GoalProfileListPage"));
const GoalProfileEditorPage = lazy(() => import("./pages/admin/goals/GoalProfileEditorPage"));




import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Create a client with performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (increased for persistence)
      retry: (failureCount, error) => {
        // Não retry para erros 4xx (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 409) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'online',
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  throttleTime: 3000, // Throttle saves to every 3 seconds
});

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    logger.info('Aplicação iniciada', { timestamp: new Date().toISOString() }, 'App');

    // Initialize monitoring (performance, errors, analytics)
    initMonitoring();

    // Initialize notification system
    const initNotifications = async () => {
      try {
        await notificationManager.initialize();
        logger.info('Sistema de notificações inicializado', {}, 'App');
      } catch (error) {
        logger.error('Falha ao inicializar sistema de notificações', error, 'App');
      }
    };

    initNotifications();
  }, []);

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }} // 24 hours
        onSuccess={() => logger.info('Cache persistente restaurado com sucesso', {}, 'App')}
      >
        <TooltipProvider>
          <AuthContextProvider>
            <DataProvider>
              <Toaster />
              <Sonner />
              <PWAInstallPrompt />
              <PWAUpdatePrompt />
              <BrowserRouter>
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    {/* Public pages */}
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/login" element={<Auth />} />

                    <Route path="/pre-cadastro" element={<PreCadastro />} />
                    <Route path="/pre-cadastro/:token" element={<PreCadastro />} />
                    <Route path="/prescricoes/publica/:qrCode" element={<PublicPrescriptionPage />} />

                    {/* Protected routes */}
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/ocupacao-fisioterapeutas" element={<ProtectedRoute><TherapistOccupancy /></ProtectedRoute>} />
                    <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
                    <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
                    <Route path="/agenda" element={<Navigate to="/schedule" replace />} />
                    <Route path="/goals" element={<Navigate to="/cadastros/objetivos" replace />} />
                    <Route path="/login" element={<Navigate to="/auth" replace />} />
                    <Route path="/perfil" element={<Navigate to="/profile" replace />} />
                    <Route path="/configuracoes" element={<Navigate to="/settings" replace />} />
                    <Route path="/schedule/settings" element={<ProtectedRoute><ScheduleSettings /></ProtectedRoute>} />
                    <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
                    <Route path="/protocols" element={<ProtectedRoute><ProtocolsPage /></ProtectedRoute>} />
                    <Route path="/financial" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/api-docs" element={<ProtectedRoute><ApiDocs /></ProtectedRoute>} />
                    {/* Mobile route disabled - PatientApp not implemented */}
                    <Route path="/medical-record" element={<ProtectedRoute><MedicalRecord /></ProtectedRoute>} />
                    <Route path="/smart-ai" element={<ProtectedRoute><SmartAI /></ProtectedRoute>} />
                    <Route path="/physiotherapy" element={<ProtectedRoute><PhysiotherapyHub /></ProtectedRoute>} />
                    <Route path="/telemedicine" element={<ProtectedRoute><Telemedicine /></ProtectedRoute>} />
                    <Route path="/exercise-library" element={<ProtectedRoute><ExerciseLibraryExpanded /></ProtectedRoute>} />
                    <Route path="/biofeedback" element={<ProtectedRoute><Biofeedback /></ProtectedRoute>} />
                    <Route path="/patient-evolution/:appointmentId" element={<ProtectedRoute><PatientEvolution /></ProtectedRoute>} />
                    <Route path="/patient-evolution-report/:patientId" element={<ProtectedRoute><PatientEvolutionReport /></ProtectedRoute>} />
                    <Route path="/session-evolution/:appointmentId" element={<ProtectedRoute><SessionEvolutionPage /></ProtectedRoute>} />
                    <Route path="/pacientes/:id/mapas-dor" element={<ProtectedRoute><PainMapHistoryPage /></ProtectedRoute>} />
                    <Route path="/patients/:patientId/evaluations/new/:formId" element={<ProtectedRoute><NewEvaluationPage /></ProtectedRoute>} />
                    <Route path="/patients/:patientId/evaluations/new" element={<ProtectedRoute><NewEvaluationPage /></ProtectedRoute>} />
                    <Route path="/communications" element={<ProtectedRoute><Communications /></ProtectedRoute>} />
                    <Route path="/partner" element={<ProtectedRoute><Partner /></ProtectedRoute>} />
                    <Route path="/waitlist" element={<ProtectedRoute><Waitlist /></ProtectedRoute>} />
                    <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
                    <Route path="/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
                    <Route path="/eventos/analytics" element={<ProtectedRoute><EventosAnalytics /></ProtectedRoute>} />
                    <Route path="/eventos/:id" element={<ProtectedRoute><EventoDetalhes /></ProtectedRoute>} />
                    <Route path="/file-upload-test" element={<ProtectedRoute><FileUploadTest /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
                    <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
                    <Route path="/admin/invitations" element={<ProtectedRoute allowedRoles={['admin']}><InvitationManagement /></ProtectedRoute>} />
                    <Route path="/admin/security" element={<ProtectedRoute allowedRoles={['admin']}><SecurityMonitoring /></ProtectedRoute>} />
                    <Route path="/security-settings" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
                    <Route path="/security-monitoring" element={<ProtectedRoute><SecurityMonitoring /></ProtectedRoute>} />
                    <Route path="/admin/crud" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><AdminCRUD /></ProtectedRoute>} />
                    <Route path="/admin/organization" element={<ProtectedRoute allowedRoles={['admin']}><OrganizationSettings /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

                    {/* Cadastros Gerais */}
                    <Route path="/cadastros/servicos" element={<ProtectedRoute><ServicosPage /></ProtectedRoute>} />
                    <Route path="/cadastros/fornecedores" element={<ProtectedRoute><FornecedoresPage /></ProtectedRoute>} />
                    <Route path="/cadastros/feriados" element={<ProtectedRoute><FeriadosPage /></ProtectedRoute>} />
                    <Route path="/cadastros/atestados" element={<ProtectedRoute><AtestadosPage /></ProtectedRoute>} />
                    <Route path="/cadastros/contratos" element={<ProtectedRoute><ContratosPage /></ProtectedRoute>} />

                    {/* Cadastros Clínicos - Fase 3 */}
                    <Route path="/cadastros/templates-evolucao" element={<ProtectedRoute><EvolutionTemplatesPage /></ProtectedRoute>} />
                    <Route path="/cadastros/fichas-avaliacao" element={<ProtectedRoute><EvaluationFormsPage /></ProtectedRoute>} />
                    <Route path="/cadastros/fichas-avaliacao/:id/campos" element={<ProtectedRoute><EvaluationFormBuilderPage /></ProtectedRoute>} />
                    <Route path="/cadastros/objetivos" element={<ProtectedRoute><PatientObjectivesPage /></ProtectedRoute>} />

                    {/* Financeiro Avançado - Fase 4 */}
                    <Route path="/financeiro/contas" element={<ProtectedRoute><ContasFinanceirasPage /></ProtectedRoute>} />
                    <Route path="/financeiro/fluxo-caixa" element={<ProtectedRoute><FluxoCaixaPage /></ProtectedRoute>} />

                    {/* Relatórios - Fase 5 */}
                    <Route path="/relatorios/aniversariantes" element={<ProtectedRoute><AniversariantesPage /></ProtectedRoute>} />
                    <Route path="/relatorios/comparecimento" element={<ProtectedRoute><AttendanceReport /></ProtectedRoute>} />
                    <Route path="/performance-equipe" element={<ProtectedRoute><TeamPerformance /></ProtectedRoute>} />

                    {/* Configurações */}
                    <Route path="/configuracoes/calendario" element={<ProtectedRoute><CalendarSettings /></ProtectedRoute>} />

                    {/* Marketing/CRM - Fase 6 */}
                    <Route path="/crm" element={<ProtectedRoute><CRMDashboard /></ProtectedRoute>} />
                    <Route path="/crm/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />

                    {/* Portal do Paciente */}
                    <Route path="/portal" element={<ProtectedRoute><PatientPortal /></ProtectedRoute>} />
                    <Route path="/pre-cadastro-admin" element={<ProtectedRoute allowedRoles={['admin']}><PreCadastroAdmin /></ProtectedRoute>} />
                    <Route path="/telemedicine-room/:roomId" element={<ProtectedRoute><TelemedicineRoom /></ProtectedRoute>} />

                    <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><AdvancedAnalytics /></ProtectedRoute>} />
                    <Route path="/smart-dashboard" element={<ProtectedRoute><SmartDashboard /></ProtectedRoute>} />
                    <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                    <Route path="/gamification" element={<ProtectedRoute><PatientGamificationPage /></ProtectedRoute>} />
                    <Route path="/chatbot" element={<ProtectedRoute><MedicalChatbot userId="current-user" /></ProtectedRoute>} />
                    <Route path="/computer-vision" element={<ProtectedRoute><ComputerVisionExercise patientId="current-patient" /></ProtectedRoute>} />
                    <Route path="/intelligent-reports" element={<ProtectedRoute><IntelligentReports patientId="demo-patient" patientName="Paciente Demo" /></ProtectedRoute>} />
                    <Route path="/augmented-reality" element={<ProtectedRoute><AugmentedRealityExercise patientId="current-patient" /></ProtectedRoute>} />

                    {/* Image Analysis Module (NeuroPose) */}
                    <Route path="/dashboard/imagens" element={<ProtectedRoute><ImageAnalysisDashboard /></ProtectedRoute>} />
                    <Route path="/pacientes/:id/imagens" element={<ProtectedRoute><ImageAnalysisDashboard /></ProtectedRoute>} />
                    <Route path="/dashboard/dinamica/:id" element={<ProtectedRoute><DynamicCompareDetailsPage /></ProtectedRoute>} />

                    {/* Goals Admin */}
                    <Route path="/admin/goals" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><GoalProfileListPage /></ProtectedRoute>} />
                    <Route path="/admin/goals/:id" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><GoalProfileEditorPage /></ProtectedRoute>} />


                    {/* Catch-all route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </DataProvider>
          </AuthContextProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};


export default App;
