import { lazy } from "react";
import {
	Route,
	Navigate,
	createBrowserRouter,
	createRoutesFromElements,
} from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
	InfrastructureLayout,
	AppShellLayout,
} from "@/components/layout/RouterLayouts";
import {
	adminRoutes,
	aiRoutes,
	authRoutes,
	cadastrosRoutes,
	coreRoutes,
	enterpriseRoutes,
	financialRoutes,
	gamificationRoutes,
	marketingRoutes,
	patientsRoutes,
	reportsRoutes,
	whatsappRoutes,
} from "./index";
import { RouterErrorElement } from "@/components/error/RouterErrorElement";

const BookingPage = lazy(() =>
	import("@/pages/public/BookingPage").then((module) => ({
		default: module.BookingPage,
	})),
);
const PublicPrescriptionPage = lazy(
	() => import("@/pages/prescricoes/PublicPrescriptionPage"),
);
const Install = lazy(() => import("@/pages/Install"));
const SeedData = lazy(() => import("@/pages/SeedData"));
const ErrorPage = lazy(() => import("@/pages/ErrorPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const MasterDataHub = lazy(() => import("@/pages/cadastros/MasterDataHub"));

export const router = createBrowserRouter(
	createRoutesFromElements(
		<Route
			element={<InfrastructureLayout />}
			errorElement={<RouterErrorElement />}
		>
			<Route element={<AppShellLayout />}>
				{authRoutes}
				{coreRoutes}
				{patientsRoutes}
				{cadastrosRoutes}
				{financialRoutes}
				{reportsRoutes}
				{adminRoutes}
				{marketingRoutes}
				{aiRoutes}
				{gamificationRoutes}
				{enterpriseRoutes}
				{whatsappRoutes}

				<Route
					path="/prescricoes/publica/:qrCode"
					element={<PublicPrescriptionPage />}
				/>
				<Route path="/agendar/:slug" element={<BookingPage />} />
				<Route path="/install" element={<Install />} />
				<Route
					path="/admin"
					element={<Navigate to="/admin/analytics" replace />}
				/>
				<Route
					path="/goals"
					element={<Navigate to="/cadastros/objetivos" replace />}
				/>
				<Route
					path="/cadastros"
					element={
						<ProtectedRoute>
							<MasterDataHub />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/seed-data"
					element={
						<ProtectedRoute>
							<SeedData />
						</ProtectedRoute>
					}
				/>
				<Route path="/error" element={<ErrorPage />} />
				<Route path="*" element={<NotFound />} />
			</Route>
		</Route>,
	),
	{
		future: {
			v7_fetcherPersist: true,
			v7_normalizeFormMethod: true,
			v7_partialHydration: true,
			v7_relativeSplatPath: true,
			v7_skipActionErrorRevalidation: true,
		},
	},
);
