/**
 * FisioFlow - Rotas Enterprise (Features Avançadas)
 * @module routes/enterprise
 */

import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WikiDashboard, WikiLayout } from "@/features/wiki";

// Lazy loads - Enterprise Features
const TimeTracking = lazy(
	() => import(/* webpackChunkName: "timetracking" */ "@/pages/TimeTracking"),
);
const Automation = lazy(
	() => import(/* webpackChunkName: "automation" */ "@/pages/Automation"),
);
const Integrations = lazy(
	() => import(/* webpackChunkName: "integrations" */ "@/pages/Integrations"),
);
const WikiWorkspacePage = lazy(
	() => import(/* webpackChunkName: "wiki" */ "@/pages/Wiki"),
);
const KnowledgeArticleDetailPage = lazy(
	() => import(/* webpackChunkName: "knowledge-article-detail" */ "@/pages/KnowledgeArticleDetail"),
);
const TemplateAnalyticsPage = lazy(
	() =>
		import(
			/* webpackChunkName: "wiki-template-analytics" */ "@/features/wiki/pages/TemplateAnalyticsPage"
		),
);

// Projects
const Projects = lazy(
	() => import(/* webpackChunkName: "projects" */ "@/pages/Projects"),
);
const ProjectDetails = lazy(
	() =>
		import(/* webpackChunkName: "project-details" */ "@/pages/ProjectDetails"),
);

// Boards / Tasks
const BoardsHome = lazy(
	() => import(/* webpackChunkName: "boards-home" */ "@/pages/BoardsHome"),
);
const BoardDetail = lazy(
	() => import(/* webpackChunkName: "boards-detail" */ "@/pages/BoardDetail"),
);

// Clinical
const ClinicalTestsLibrary = lazy(
	() =>
		import(
			/* webpackChunkName: "clinical-tests" */ "@/pages/ClinicalTestsLibrary"
		),
);
const BiomechanicsAnalysisPage = lazy(
	() =>
		import(
			/* webpackChunkName: "biomechanics" */ "@/pages/clinical/BiomechanicsAnalysisPage"
		),
);
const JumpAnalysisPage = lazy(
	() =>
		import(
			/* webpackChunkName: "jump-analysis" */ "@/pages/clinical/jump/JumpAnalysisPage"
		),
);
const GaitAnalysisPage = lazy(
	() =>
		import(
			/* webpackChunkName: "gait-analysis" */ "@/pages/clinical/gait/GaitAnalysisPage"
		),
);
const PostureAnalysisPage = lazy(
	() =>
		import(
			/* webpackChunkName: "posture-analysis" */ "@/pages/clinical/posture/PostureAnalysisPage"
		),
);
const FunctionalAnalysisPage = lazy(
	() =>
		import(
			/* webpackChunkName: "functional-analysis" */ "@/pages/clinical/functional/FunctionalAnalysisPage"
		),
);
const TherapistOccupancy = lazy(
	() =>
		import(/* webpackChunkName: "occupancy" */ "@/pages/TherapistOccupancy"),
);

// Events
const Eventos = lazy(
	() => import(/* webpackChunkName: "events" */ "@/pages/Eventos"),
);
const EventoDetalhes = lazy(
	() =>
		import(/* webpackChunkName: "events-detail" */ "@/pages/EventoDetalhes"),
);
const EventosAnalytics = lazy(
	() =>
		import(
			/* webpackChunkName: "events-analytics" */ "@/pages/EventosAnalytics"
		),
);

// Vouchers & Partner
const Partner = lazy(
	() => import(/* webpackChunkName: "vouchers-partners" */ "@/pages/Partner"),
);
const Vouchers = lazy(
	() => import(/* webpackChunkName: "vouchers" */ "@/pages/Vouchers"),
);

// Misc
const Surveys = lazy(
	() => import(/* webpackChunkName: "surveys" */ "@/pages/Surveys"),
);
const Inventory = lazy(
	() => import(/* webpackChunkName: "inventory" */ "@/pages/Inventory"),
);
const Notifications = lazy(
	() => import(/* webpackChunkName: "notifications" */ "@/pages/Notifications"),
);

// Physiotherapy
const PhysiotherapyHub = lazy(
	() =>
		import(/* webpackChunkName: "physiotherapy" */ "@/pages/PhysiotherapyHub"),
);
const Telemedicine = lazy(
	() => import(/* webpackChunkName: "telemedicine" */ "@/pages/Telemedicine"),
);
const TelemedicineRoom = lazy(
	() =>
		import(
			/* webpackChunkName: "telemedicine-room" */ "@/pages/TelemedicineRoom"
		),
);
// CRM
const CRMDashboard = lazy(
	() =>
		import(/* webpackChunkName: "crm-dashboard" */ "@/pages/crm/CRMDashboard"),
);

// Communications
const Communications = lazy(
	() =>
		import(/* webpackChunkName: "communications" */ "@/pages/Communications"),
);
const EmailTest = lazy(
	() =>
		import(
			/* webpackChunkName: "email-test" */ "@/pages/communications/EmailTest"
		),
);

// Settings
const ScheduleSettings = lazy(
	() =>
		import(
			/* webpackChunkName: "settings-schedule" */ "@/pages/ScheduleSettings"
		),
);
const CalendarSettings = lazy(
	() =>
		import(
			/* webpackChunkName: "settings-calendar" */ "@/pages/configuracoes/CalendarSettings"
		),
);


export const enterpriseRoutes = (
	<>
		{/* Tasks / Boards */}
		<Route path="/tarefas" element={<Navigate to="/boards" replace />} />
		<Route path="/tarefas-v2" element={<Navigate to="/boards" replace />} />
		<Route
			path="/boards"
			element={
				<ProtectedRoute>
					<MainLayout>
						<BoardsHome />
					</MainLayout>
				</ProtectedRoute>
			}
		/>
		<Route
			path="/boards/:boardId"
			element={
				<ProtectedRoute>
					<MainLayout>
						<BoardDetail />
					</MainLayout>
				</ProtectedRoute>
			}
		/>

		{/* Enterprise Features */}
		<Route
			path="/timetracking"
			element={
				<ProtectedRoute>
					<TimeTracking />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/automation"
			element={
				<ProtectedRoute>
					<Automation />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/integrations"
			element={
				<ProtectedRoute>
					<Integrations />
				</ProtectedRoute>
			}
		/>

		{/* Wiki */}
		<Route
			path="/wiki/template-analytics"
			element={
				<ProtectedRoute>
					<TemplateAnalyticsPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/wiki/article/:id"
			element={
				<ProtectedRoute>
					<KnowledgeArticleDetailPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/wiki/:slug?"
			element={
				<ProtectedRoute>
					<WikiWorkspacePage />
				</ProtectedRoute>
			}
		/>
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
		<Route
			path="/projects"
			element={
				<ProtectedRoute>
					<Projects />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/projects/:id"
			element={
				<ProtectedRoute>
					<ProjectDetails />
				</ProtectedRoute>
			}
		/>

		{/* Clinical */}
		<Route
			path="/clinical-tests"
			element={
				<ProtectedRoute>
					<ClinicalTestsLibrary />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/biomechanics"
			element={
				<ProtectedRoute>
					<BiomechanicsAnalysisPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/clinical/biomechanics/jump"
			element={
				<ProtectedRoute>
					<JumpAnalysisPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/clinical/biomechanics/gait"
			element={
				<ProtectedRoute>
					<GaitAnalysisPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/clinical/biomechanics/running"
			element={
				<ProtectedRoute>
					<GaitAnalysisPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/clinical/biomechanics/treadmill"
			element={
				<ProtectedRoute>
					<GaitAnalysisPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/clinical/biomechanics/posture"
			element={
				<ProtectedRoute>
					<PostureAnalysisPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/clinical/biomechanics/functional"
			element={
				<ProtectedRoute>
					<FunctionalAnalysisPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/ocupacao-fisioterapeutas"
			element={
				<ProtectedRoute>
					<TherapistOccupancy />
				</ProtectedRoute>
			}
		/>

		{/* Events */}
		<Route
			path="/eventos"
			element={
				<ProtectedRoute>
					<Eventos />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/eventos/analytics"
			element={
				<ProtectedRoute>
					<EventosAnalytics />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/eventos/:id"
			element={
				<ProtectedRoute>
					<EventoDetalhes />
				</ProtectedRoute>
			}
		/>

		{/* Vouchers & Partner */}
		<Route
			path="/partner"
			element={
				<ProtectedRoute>
					<Partner />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/vouchers"
			element={
				<ProtectedRoute>
					<Vouchers />
				</ProtectedRoute>
			}
		/>

		{/* Misc */}
		<Route
			path="/surveys"
			element={
				<ProtectedRoute>
					<Surveys />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/inventory"
			element={
				<ProtectedRoute>
					<Inventory />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/notifications"
			element={
				<ProtectedRoute>
					<Notifications />
				</ProtectedRoute>
			}
		/>

		{/* Physiotherapy */}
		<Route
			path="/physiotherapy"
			element={
				<ProtectedRoute>
					<PhysiotherapyHub />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/telemedicine"
			element={
				<ProtectedRoute>
					<Telemedicine />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/telemedicine-room/:roomId"
			element={
				<ProtectedRoute>
					<TelemedicineRoom />
				</ProtectedRoute>
			}
		/>
		{/* CRM */}
		<Route
			path="/crm"
			element={
				<ProtectedRoute>
					<CRMDashboard />
				</ProtectedRoute>
			}
		/>
		<Route path="/crm/leads" element={<Navigate to="/crm" replace />} />
		<Route path="/crm/campanhas" element={<Navigate to="/crm" replace />} />

		{/* Communications */}
		<Route
			path="/communications"
			element={
				<ProtectedRoute>
					<Communications />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/communications/email-test"
			element={
				<ProtectedRoute>
					<EmailTest />
				</ProtectedRoute>
			}
		/>

		{/* Settings */}
		<Route
			path="/agenda/settings"
			element={
				<ProtectedRoute>
					<ScheduleSettings />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/schedule/settings"
			element={<Navigate to="/agenda/settings" replace />}
		/>
		<Route
			path="/configuracoes/calendario"
			element={
				<ProtectedRoute>
					<CalendarSettings />
				</ProtectedRoute>
			}
		/>
	</>
);
