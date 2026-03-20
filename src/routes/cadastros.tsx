/**
 * FisioFlow - Rotas de Cadastros
 * @module routes/cadastros
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Lazy loads - Cadastros Gerais
const ServicosPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-services" */ "@/pages/cadastros/ServicosPage"
		),
);
const FornecedoresPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-suppliers" */ "@/pages/cadastros/FornecedoresPage"
		),
);
const FeriadosPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-holidays" */ "@/pages/cadastros/FeriadosPage"
		),
);
const AtestadosPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-certificates" */ "@/pages/cadastros/AtestadosPage"
		),
);
const ContratosPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-contracts" */ "@/pages/cadastros/ContratosPage"
		),
);
const ContratadosPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-contracted" */ "@/pages/cadastros/ContratadosPage"
		),
);

// Lazy loads - Cadastros Clínicos
const EvolutionTemplatesPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-templates" */ "@/pages/cadastros/EvolutionTemplatesPage"
		),
);
const EvaluationFormsPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-forms" */ "@/pages/cadastros/EvaluationFormsPage"
		),
);
const EvaluationFormBuilderPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-form-builder" */ "@/pages/cadastros/EvaluationFormBuilderPage"
		),
);
const PatientObjectivesPage = lazy(
	() =>
		import(
			/* webpackChunkName: "cadastros-objectives" */ "@/pages/cadastros/PatientObjectivesPage"
		),
);
const DoctorManagement = lazy(() =>
	import(
		/* webpackChunkName: "cadastros-doctors" */ "@/pages/DoctorManagement"
	).then((module) => ({ default: module.DoctorManagement })),
);

export const cadastrosRoutes = (
	<>
		{/* Cadastros Gerais */}
		<Route
			path="/cadastros/servicos"
			element={
				<ProtectedRoute>
					<ServicosPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/fornecedores"
			element={
				<ProtectedRoute>
					<FornecedoresPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/feriados"
			element={
				<ProtectedRoute>
					<FeriadosPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/atestados"
			element={
				<ProtectedRoute>
					<AtestadosPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/contratos"
			element={
				<ProtectedRoute>
					<ContratosPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/contratados"
			element={
				<ProtectedRoute>
					<ContratadosPage />
				</ProtectedRoute>
			}
		/>

		{/* Cadastros Clínicos */}
		<Route
			path="/cadastros/templates-evolucao"
			element={
				<ProtectedRoute>
					<EvolutionTemplatesPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/fichas-avaliacao"
			element={
				<ProtectedRoute>
					<EvaluationFormsPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/fichas-avaliacao/:id/campos"
			element={
				<ProtectedRoute>
					<EvaluationFormBuilderPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/objetivos"
			element={
				<ProtectedRoute>
					<PatientObjectivesPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/cadastros/medicos"
			element={
				<ProtectedRoute>
					<DoctorManagement />
				</ProtectedRoute>
			}
		/>
	</>
);
