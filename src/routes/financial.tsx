/**
 * FisioFlow - Rotas Financeiras
 * @module routes/financial
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

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
	</>
);
