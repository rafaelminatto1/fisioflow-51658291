/**
 * FisioFlow - Rotas de Pacientes
 * @module routes/patients
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy loads - Patient related
const PatientEvolution = lazy(
	() =>
		import(
			/* webpackChunkName: "patient-evolution" */ "@/pages/PatientEvolution"
		),
);
const PatientEvolutionReport = lazy(
	() =>
		import(
			/* webpackChunkName: "patient-evolution-report" */ "@/pages/PatientEvolutionReport"
		),
);
const SessionEvolutionPage = lazy(
	() =>
		import(
			/* webpackChunkName: "session-evolution" */ "@/pages/SessionEvolutionPage"
		),
);
const PainMapHistoryPage = lazy(
	() =>
		import(
			/* webpackChunkName: "pain-maps" */ "@/pages/patients/PainMapHistoryPage"
		),
);
const NewEvaluationPage = lazy(
	() =>
		import(
			/* webpackChunkName: "evaluation-new" */ "@/pages/patients/NewEvaluationPage"
		),
);
const PatientProfilePage = lazy(
	() =>
		import(
			/* webpackChunkName: "patient-profile" */ "@/pages/patients/PatientProfilePage"
		),
);
const NewPatientPage = lazy(
	() =>
		import(
			/* webpackChunkName: "patient-new" */ "@/pages/patients/NewPatientPage"
		),
);
const PatientPortal = lazy(
	() =>
		import(/* webpackChunkName: "portal-patient" */ "@/pages/PatientPortal"),
);

export const patientsRoutes = (
	<>
		{/* Patient Profile */}
		<Route
			path="/patients/new"
			element={
				<ProtectedRoute>
					<NewPatientPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/patients/:id"
			element={
				<ProtectedRoute>
					<PatientProfilePage />
				</ProtectedRoute>
			}
		/>

		{/* Patient Evolution */}
		<Route
			path="/patient-evolution/:appointmentId"
			element={
				<ProtectedRoute>
					<PatientEvolution />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/patient-evolution-report/:patientId"
			element={
				<ProtectedRoute>
					<PatientEvolutionReport />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/session-evolution/:appointmentId"
			element={
				<ProtectedRoute>
					<SessionEvolutionPage />
				</ProtectedRoute>
			}
		/>

		{/* Pain Maps */}
		<Route
			path="/pacientes/:id/mapas-dor"
			element={
				<ProtectedRoute>
					<PainMapHistoryPage />
				</ProtectedRoute>
			}
		/>

		{/* Evaluations */}
		<Route
			path="/patients/:patientId/evaluations/new/:formId"
			element={
				<ProtectedRoute>
					<NewEvaluationPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/patients/:patientId/evaluations/new"
			element={
				<ProtectedRoute>
					<NewEvaluationPage />
				</ProtectedRoute>
			}
		/>

		{/* Patient Portal */}
		<Route
			path="/portal"
			element={
				<ProtectedRoute>
					<PatientPortal />
				</ProtectedRoute>
			}
		/>
	</>
);
