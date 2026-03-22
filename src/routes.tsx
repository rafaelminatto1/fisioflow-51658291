import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
} from "./routes/index";

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

export function AppRoutes() {
	return (
		<Routes>
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

			<Route
				path="/prescricoes/publica/:qrCode"
				element={<PublicPrescriptionPage />}
			/>
			<Route path="/agendar/:slug" element={<BookingPage />} />
			<Route path="/install" element={<Install />} />
			<Route path="/admin" element={<Navigate to="/admin/analytics" replace />} />
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
		</Routes>
	);
}
