/**
 * Reports hooks powered by the Neon/Workers analytics API
 */

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/workers-client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardKPIs {
	activePatients: number;
	monthlyRevenue: number;
	occupancyRate: number;
	noShowRate: number;
	confirmationRate: number;
	npsScore: number;
	appointmentsToday: number;
	revenueChart: { date: string; revenue: number }[];
}

export interface FinancialReport {
	totalRevenue: number;
	totalExpenses: number;
	netIncome: number;
	revenueByMethod: Record<string, number>;
	revenueByTherapist: {
		therapistId: string;
		therapistName: string;
		revenue: number;
		sessions: number;
	}[];
	delinquencyRate: number;
}

export interface PatientEvolutionPoint {
	id: string;
	date: string;
	averageEva: number;
}

const derivePeriodRange = (
	period: string,
): { startDate?: string; endDate?: string } => {
	const today = new Date();
	const iso = (date: Date) => date.toISOString().split("T")[0];
	switch (period) {
		case "week": {
			const weekStart = new Date(today);
			weekStart.setDate(today.getDate() - 7);
			return { startDate: iso(weekStart), endDate: iso(today) };
		}
		case "quarter": {
			const quarterStart = new Date(today);
			quarterStart.setMonth(today.getMonth() - 3);
			return { startDate: iso(quarterStart), endDate: iso(today) };
		}
		default: {
			const monthStart = new Date(today);
			monthStart.setMonth(today.getMonth() - 1);
			return { startDate: iso(monthStart), endDate: iso(today) };
		}
	}
};

export function useDashboardKPIs(period: string = "month") {
	const { user } = useAuth();
	const range = derivePeriodRange(period);

	return useQuery({
		queryKey: ["reports", "dashboard", period],
		queryFn: async () => {
			const { data } = await analyticsApi.dashboard({ period, ...range });
			return data;
		},
		enabled: !!user,
		staleTime: 5 * 60 * 1000,
	});
}

export function useFinancialReport(startDate: string, endDate: string) {
	return useQuery({
		queryKey: ["reports", "financial", startDate, endDate],
		queryFn: async () => {
			const { data } = await analyticsApi.financial({ startDate, endDate });
			return data;
		},
		enabled: !!startDate && !!endDate,
		staleTime: 5 * 60 * 1000,
	});
}

export function usePatientEvolution(patientId: string | undefined) {
	return useQuery({
		queryKey: ["reports", "patient-evolution", patientId],
		queryFn: async () => {
			if (!patientId) return null;
			const { data } = await analyticsApi.patientEvolution(patientId);
			return data;
		},
		enabled: !!patientId,
	});
}
