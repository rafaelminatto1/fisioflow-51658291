/**
 * FisioFlow - Rotas Financeiras
 * @module routes/financial
 */

import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { APP_ROUTES } from "@/lib/routing/appRoutes";

// Lazy loads - Financeiro
const ContasFinanceirasPage = lazy(
	() =>
		import(
			/* webpackChunkName: "financial-accounts" */ "@/pages/financeiro/ContasFinanceirasPage"
		),
);
const FluxoCaixaPage = lazy(
	() =>
		import(
			/* webpackChunkName: "financial-cashflow" */ "@/pages/financeiro/FluxoCaixaPage"
		),
);
const NFSePage = lazy(
	() =>
		import(
			/* webpackChunkName: "financial-nfse" */ "@/pages/financeiro/NFSePage"
		),
);
const RecibosPage = lazy(
	() =>
		import(
			/* webpackChunkName: "financial-recibos" */ "@/pages/financeiro/RecibosPage"
		),
);
const DemonstrativoMensalPage = lazy(
	() =>
		import(
			/* webpackChunkName: "financial-demonstrativo" */ "@/pages/financeiro/DemonstrativoMensalPage"
		),
);
const SimuladorReceitasPage = lazy(
	() =>
		import(
			/* webpackChunkName: "financial-simulador" */ "@/pages/financeiro/SimuladorReceitasPage"
		),
);
const CommissionsPage = lazy(() =>
	import(
		/* webpackChunkName: "financial-commissions" */ "@/components/financial/CommissionsDashboard"
	).then((m) => ({ default: m.CommissionsDashboard })),
);

export const financialRoutes = (
	<>
		<Route
			path="/financeiro/contas"
			element={
				<ProtectedRoute>
					<ContasFinanceirasPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/financeiro/fluxo-caixa"
			element={
				<ProtectedRoute>
					<FluxoCaixaPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/financeiro/nfse"
			element={
				<ProtectedRoute>
					<NFSePage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/financeiro/recibos"
			element={
				<ProtectedRoute>
					<RecibosPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/financeiro/demonstrativo"
			element={
				<ProtectedRoute>
					<DemonstrativoMensalPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/financeiro/simulador"
			element={
				<ProtectedRoute>
					<SimuladorReceitasPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/financeiro/comissoes"
			element={
				<ProtectedRoute>
					<CommissionsPage />
				</ProtectedRoute>
			}
		/>
		<Route
			path="/financeiro"
			element={
				<ProtectedRoute>
					<Navigate to={APP_ROUTES.FINANCIAL} replace />
				</ProtectedRoute>
			}
		/>
	</>
);
