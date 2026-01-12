import { lazy } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
const ClinicalTestsLibrary = lazy(() => import("./pages/ClinicalTestsLibrary"));

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

            {/* Image Analysis Module (NeuroPose) */}
            <Route path="/dashboard/imagens" element={<ProtectedRoute><ImageAnalysisDashboard /></ProtectedRoute>} />
            <Route path="/pacientes/:id/imagens" element={<ProtectedRoute><ImageAnalysisDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/dinamica/:id" element={<ProtectedRoute><DynamicCompareDetailsPage /></ProtectedRoute>} />

            {/* Goals Admin */}
            <Route path="/admin/goals" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><GoalProfileListPage /></ProtectedRoute>} />
            <Route path="/admin/goals/:id" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><GoalProfileEditorPage /></ProtectedRoute>} />

            <Route path="/clinical-tests" element={<ProtectedRoute><ClinicalTestsLibrary /></ProtectedRoute>} />


            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
