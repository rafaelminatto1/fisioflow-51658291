import { lazy } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy load pages for better performance with webpack chunk names for better debugging
const Welcome = lazy(() => import(/* webpackChunkName: "auth-welcome" */ "./pages/Welcome"));
const Auth = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/Auth"));

// Core pages - High priority chunks
const Index = lazy(() => import(/* webpackChunkName: "dashboard" */ "./pages/Index"));
const Patients = lazy(() => import(/* webpackChunkName: "patients" */ "./pages/Patients"));
const Schedule = lazy(() => import(/* webpackChunkName: "schedule" */ "./pages/Schedule"));
const Exercises = lazy(() => import(/* webpackChunkName: "exercises" */ "./pages/Exercises"));
const Financial = lazy(() => import(/* webpackChunkName: "financial" */ "./pages/Financial"));
const Reports = lazy(() => import(/* webpackChunkName: "reports" */ "./pages/Reports"));
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ "./pages/Settings"));
const Profile = lazy(() => import(/* webpackChunkName: "profile" */ "./pages/Profile").then(module => ({ default: module.Profile })));
const MedicalRecord = lazy(() => import(/* webpackChunkName: "medical-record" */ "./pages/MedicalRecord"));

// Feature pages - Medium priority chunks
const SmartDashboard = lazy(() => import(/* webpackChunkName: "smart-dashboard" */ "./pages/SmartDashboard"));
const SmartAI = lazy(() => import(/* webpackChunkName: "ai-smart" */ "./pages/SmartAI"));
const PhysiotherapyHub = lazy(() => import(/* webpackChunkName: "physiotherapy" */ "./pages/PhysiotherapyHub"));
const Telemedicine = lazy(() => import(/* webpackChunkName: "telemedicine" */ "./pages/Telemedicine"));
const TelemedicineRoom = lazy(() => import(/* webpackChunkName: "telemedicine-room" */ "./pages/TelemedicineRoom"));
const ExerciseLibraryExpanded = lazy(() => import(/* webpackChunkName: "exercises-library" */ "./pages/ExerciseLibraryExpanded"));
const Biofeedback = lazy(() => import(/* webpackChunkName: "biofeedback" */ "./pages/Biofeedback"));
const PatientEvolution = lazy(() => import(/* webpackChunkName: "patient-evolution" */ "./pages/PatientEvolution"));
const PatientEvolutionReport = lazy(() => import(/* webpackChunkName: "patient-evolution-report" */ "./pages/PatientEvolutionReport"));
const SessionEvolutionPage = lazy(() => import(/* webpackChunkName: "session-evolution" */ "./pages/SessionEvolutionPage"));
const PainMapHistoryPage = lazy(() => import(/* webpackChunkName: "pain-maps" */ "./pages/patients/PainMapHistoryPage"));
const NewEvaluationPage = lazy(() => import(/* webpackChunkName: "evaluation-new" */ "./pages/patients/NewEvaluationPage"));
const PatientProfilePage = lazy(() => import(/* webpackChunkName: "patient-profile" */ "./pages/patients/PatientProfilePage"));
const Communications = lazy(() => import(/* webpackChunkName: "communications" */ "./pages/Communications"));

// Settings & configuration pages
const ScheduleSettings = lazy(() => import(/* webpackChunkName: "settings-schedule" */ "./pages/ScheduleSettings"));
const CalendarSettings = lazy(() => import(/* webpackChunkName: "settings-calendar" */ "./pages/configuracoes/CalendarSettings"));

// Registration pages (Cadastros)
const ServicosPage = lazy(() => import(/* webpackChunkName: "cadastros-services" */ "./pages/cadastros/ServicosPage"));
const FornecedoresPage = lazy(() => import(/* webpackChunkName: "cadastros-suppliers" */ "./pages/cadastros/FornecedoresPage"));
const FeriadosPage = lazy(() => import(/* webpackChunkName: "cadastros-holidays" */ "./pages/cadastros/FeriadosPage"));
const AtestadosPage = lazy(() => import(/* webpackChunkName: "cadastros-certificates" */ "./pages/cadastros/AtestadosPage"));
const ContratosPage = lazy(() => import(/* webpackChunkName: "cadastros-contracts" */ "./pages/cadastros/ContratosPage"));
const EvolutionTemplatesPage = lazy(() => import(/* webpackChunkName: "cadastros-templates" */ "./pages/cadastros/EvolutionTemplatesPage"));
const EvaluationFormsPage = lazy(() => import(/* webpackChunkName: "cadastros-forms" */ "./pages/cadastros/EvaluationFormsPage"));
const EvaluationFormBuilderPage = lazy(() => import(/* webpackChunkName: "cadastros-form-builder" */ "./pages/cadastros/EvaluationFormBuilderPage"));
const PatientObjectivesPage = lazy(() => import(/* webpackChunkName: "cadastros-objectives" */ "./pages/cadastros/PatientObjectivesPage"));

// Financial pages
const ContasFinanceirasPage = lazy(() => import(/* webpackChunkName: "financial-accounts" */ "./pages/financeiro/ContasFinanceirasPage"));
const FluxoCaixaPage = lazy(() => import(/* webpackChunkName: "financial-cashflow" */ "./pages/financeiro/FluxoCaixaPage"));

// Reports pages
const AniversariantesPage = lazy(() => import(/* webpackChunkName: "reports-birthdays" */ "./pages/relatorios/AniversariantesPage"));
const AttendanceReport = lazy(() => import(/* webpackChunkName: "reports-attendance" */ "./pages/relatorios/AttendanceReport"));
const TeamPerformance = lazy(() => import(/* webpackChunkName: "reports-team" */ "./pages/relatorios/TeamPerformance"));

// Advanced features - Lower priority chunks
const Partner = lazy(() => import(/* webpackChunkName: "vouchers-partners" */ "./pages/Partner"));
const Vouchers = lazy(() => import(/* webpackChunkName: "vouchers" */ "./pages/Vouchers"));
const Install = lazy(() => import(/* webpackChunkName: "install" */ "./pages/Install"));
const Waitlist = lazy(() => import(/* webpackChunkName: "waitlist" */ "./pages/Waitlist"));
const Surveys = lazy(() => import(/* webpackChunkName: "surveys" */ "./pages/Surveys"));
const Tarefas = lazy(() => import(/* webpackChunkName: "tasks" */ "./pages/Tarefas"));
const Inventory = lazy(() => import(/* webpackChunkName: "inventory" */ "./pages/Inventory"));
const ProtocolsPage = lazy(() => import(/* webpackChunkName: "protocols" */ "./pages/Protocols"));

// Events & Campaigns
const Eventos = lazy(() => import(/* webpackChunkName: "events" */ "./pages/Eventos"));
const EventoDetalhes = lazy(() => import(/* webpackChunkName: "events-detail" */ "./pages/EventoDetalhes"));
const EventosAnalytics = lazy(() => import(/* webpackChunkName: "events-analytics" */ "./pages/EventosAnalytics"));

// Admin & Security
const UserManagement = lazy(() => import(/* webpackChunkName: "admin-users" */ "./pages/UserManagement"));
const AuditLogs = lazy(() => import(/* webpackChunkName: "admin-audit" */ "./pages/AuditLogs"));
const InvitationManagement = lazy(() => import(/* webpackChunkName: "admin-invitations" */ "./pages/InvitationManagement"));
const SecurityMonitoring = lazy(() => import(/* webpackChunkName: "admin-security" */ "./pages/SecurityMonitoring"));
const SecuritySettings = lazy(() => import(/* webpackChunkName: "settings-security" */ "./pages/SecuritySettings"));
const AdminCRUD = lazy(() => import(/* webpackChunkName: "admin-crud" */ "./pages/AdminCRUD"));
const OrganizationSettings = lazy(() => import(/* webpackChunkName: "admin-organization" */ "./pages/OrganizationSettings"));
const Admin = lazy(() => import(/* webpackChunkName: "admin-analytics" */ "./pages/Admin"));
const AdvancedAnalytics = lazy(() => import(/* webpackChunkName: "analytics-advanced" */ "./pages/AdvancedAnalytics"));
const CohortAnalysis = lazy(() => import(/* webpackChunkName: "analytics-cohorts" */ "./pages/CohortAnalysis"));
const ApiDocs = lazy(() => import(/* webpackChunkName: "api-docs" */ "./pages/ApiDocs"));

// Gamification
const PatientGamificationPage = lazy(() => import(/* webpackChunkName: "gamification-patient" */ "./pages/PatientGamificationPage"));
const AdminGamificationPage = lazy(() => import(/* webpackChunkName: "gamification-admin" */ "./pages/admin/gamification/AdminGamificationPage"));

// Goals
const GoalProfileListPage = lazy(() => import(/* webpackChunkName: "goals-list" */ "./pages/admin/goals/GoalProfileListPage"));
const GoalProfileEditorPage = lazy(() => import(/* webpackChunkName: "goals-editor" */ "./pages/admin/goals/GoalProfileEditorPage"));

// AI & Advanced Features
const MedicalChatbot = lazy(() => import(/* webpackChunkName: "ai-chatbot" */ "./components/chatbot/MedicalChatbot"));
const ComputerVisionExercise = lazy(() => import(/* webpackChunkName: "ai-computer-vision" */ "./components/computer-vision/ComputerVisionExercise"));
const IntelligentReports = lazy(() => import(/* webpackChunkName: "ai-intelligent-reports" */ "./components/reports/IntelligentReports"));
const AugmentedRealityExercise = lazy(() => import(/* webpackChunkName: "ai-ar" */ "./components/ar/AugmentedRealityExercise"));

// Image Analysis (NeuroPose)
const ImageAnalysisDashboard = lazy(() => import(/* webpackChunkName: "analysis-images" */ "./components/analysis/dashboard/ImageAnalysisDashboard"));
const DynamicCompareDetailsPage = lazy(() => import(/* webpackChunkName: "analysis-dynamic" */ "./pages/dashboard/dinamica/DynamicCompareDetailsPage"));

// CRM & Portal
const LeadsPage = lazy(() => import(/* webpackChunkName: "crm-leads" */ "./pages/crm/LeadsPage"));
const CRMDashboard = lazy(() => import(/* webpackChunkName: "crm-dashboard" */ "./pages/crm/CRMDashboard"));
const PatientPortal = lazy(() => import(/* webpackChunkName: "portal-patient" */ "./pages/PatientPortal"));

// Pre-cadastro
const PreCadastro = lazy(() => import(/* webpackChunkName: "pre-cadastro" */ "./pages/PreCadastro"));
const PreCadastroAdmin = lazy(() => import(/* webpackChunkName: "pre-cadastro-admin" */ "./pages/PreCadastroAdmin"));

// Misc
const Notifications = lazy(() => import(/* webpackChunkName: "notifications" */ "./pages/Notifications"));
const TherapistOccupancy = lazy(() => import(/* webpackChunkName: "occupancy" */ "./pages/TherapistOccupancy"));
const PublicPrescriptionPage = lazy(() => import(/* webpackChunkName: "prescription-public" */ "./pages/prescricoes/PublicPrescriptionPage"));
const FileUploadTest = lazy(() => import(/* webpackChunkName: "test-upload" */ "./pages/FileUploadTest"));
const ClinicalTestsLibrary = lazy(() => import(/* webpackChunkName: "clinical-tests" */ "./pages/ClinicalTestsLibrary"));
const NotFound = lazy(() => import(/* webpackChunkName: "not-found" */ "./pages/NotFound"));

export function AppRoutes() {
    return (
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
            <Route path="/admin/gamification" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><AdminGamificationPage /></ProtectedRoute>} />

            {/* Image Analysis Module (NeuroPose) */}
            <Route path="/dashboard/imagens" element={<ProtectedRoute><ImageAnalysisDashboard /></ProtectedRoute>} />
            <Route path="/pacientes/:id/imagens" element={<ProtectedRoute><ImageAnalysisDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/dinamica/:id" element={<ProtectedRoute><DynamicCompareDetailsPage /></ProtectedRoute>} />

            {/* Patient Profile - New Route */}
            <Route path="/patients/:id" element={<ProtectedRoute><PatientProfilePage /></ProtectedRoute>} />

            {/* Goals Admin */}
            <Route path="/admin/goals" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><GoalProfileListPage /></ProtectedRoute>} />
            <Route path="/admin/goals/:id" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><GoalProfileEditorPage /></ProtectedRoute>} />

            <Route path="/clinical-tests" element={<ProtectedRoute><ClinicalTestsLibrary /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><Admin /></ProtectedRoute>} />
            <Route path="/admin/cohorts" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><CohortAnalysis /></ProtectedRoute>} />


            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
