import { useQuery } from "@tanstack/react-query";
import { exerciseSessionsApi } from "@/api/v2/rehab";
import { evolutionApi } from "@/api/v2/clinical";
import { useMemo } from "react";
import type { ExerciseSessionRow, EvolutionMeasurementRecord } from "@/types/workers";

export interface EvolutionDashboardMetrics {
	adherence: {
		rate: number; // 0-100
		trend: "up" | "down" | "stable";
		totalSessions: number;
		completedSessions: number;
	};
	intensity: {
		avgRpe: number;
		history: Array<{
			date: string;
			rpe: number;
			pain: number;
		}>;
		peakIntensity: number;
	};
	clinical: {
		overallProgress: number; // 0-100
		metricsHistory: Array<{
			date: string;
			name: string;
			value: number;
			unit: string;
		}>;
	};
}

/**
 * Hook para buscar dados consolidados para o dashboard de evolução.
 * Inclui gerador de mocks para prototipagem rápida.
 */
export function useEvolutionDashboardData(patientId: string, useMocks = false) {
	const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
		queryKey: ["exercise-sessions", "evolution-dashboard", patientId],
		queryFn: () => exerciseSessionsApi.list({ patientId, limit: 100 }),
		enabled: !!patientId && !useMocks,
	});

	const { data: measurementsData, isLoading: isLoadingMeasurements } = useQuery({
		queryKey: ["evolution-measurements", "evolution-dashboard", patientId],
		queryFn: () => evolutionApi.measurements.list(patientId),
		enabled: !!patientId && !useMocks,
	});

	const dashboardData = useMemo(() => {
		if (useMocks) {
			return generateMockData();
		}

		if (!sessionsData?.data || !measurementsData?.data) {
			return null;
		}

		return processRealData(sessionsData.data, measurementsData.data);
	}, [sessionsData, measurementsData, useMocks]);

	return {
		data: dashboardData,
		isLoading: useMocks ? false : isLoadingSessions || isLoadingMeasurements,
	};
}

/**
 * Processa dados reais vindos da API
 */
function processRealData(
	sessions: ExerciseSessionRow[],
	measurements: EvolutionMeasurementRecord[],
): EvolutionDashboardMetrics {
	// Cálculo de Adesão
	const totalSessions = sessions.length || 1;
	const completedSessions = sessions.filter(s => s.status === "completed").length;
	const adherenceRate = Math.round((completedSessions / totalSessions) * 100);

	// Cálculo de Intensidade (RPE)
	const intensityHistory = sessions
		.filter(s => s.status === "completed" && s.metrics)
		.map(s => ({
			date: s.completed_at || s.created_at,
			rpe: s.metrics?.rpe || 0,
			pain: s.metrics?.pain_level || 0,
		}))
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	const avgRpe = intensityHistory.length 
		? Number((intensityHistory.reduce((acc, curr) => acc + curr.rpe, 0) / intensityHistory.length).toFixed(1))
		: 0;

	const peakIntensity = Math.max(...intensityHistory.map(h => h.rpe), 0);

	// Dados Clínicos
	const clinicalHistory = measurements
		.map(m => ({
			date: m.recorded_at,
			name: m.measurement_name,
			value: Number(m.measurement_value),
			unit: m.measurement_unit,
		}))
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	// Cálculo de Progresso Clínico Real
	// Agrupamos métricas por nome para ver a evolução de cada uma
	const metricsByName: Record<string, number[]> = {};
	clinicalHistory.forEach(m => {
		if (!metricsByName[m.name]) metricsByName[m.name] = [];
		metricsByName[m.name].push(m.value);
	});

	let totalImprovement = 0;
	let measurableMetrics = 0;

	Object.keys(metricsByName).forEach(name => {
		const values = metricsByName[name];
		if (values.length >= 2) {
			const initial = values[0];
			const current = values[values.length - 1];
			// Evitar divisão por zero e considerar melhoria (assumindo que maior é melhor na maioria dos testes físicos)
			// TODO: No futuro, cada teste pode ter uma polaridade (menor é melhor ou maior é melhor)
			if (initial !== 0) {
				const improvement = ((current - initial) / initial) * 100;
				totalImprovement += Math.max(0, Math.min(100, improvement)); // Cap 0-100 por métrica
				measurableMetrics++;
			}
		}
	});

	const avgClinicalImprovement = measurableMetrics > 0 ? totalImprovement / measurableMetrics : 0;
	
	// Heurística de Progresso Geral: 40% Adesão + 60% Melhoria Clínica
	// Se não houver melhoria clínica mensurável, usamos a adesão como base principal
	const overallProgress = measurableMetrics > 0
		? Math.round((adherenceRate * 0.4) + (avgClinicalImprovement * 0.6))
		: Math.round(adherenceRate * 0.7); // Se não tem testes, progresso é baseado no esforço (adesão)

	return {
		adherence: {
			rate: adherenceRate,
			trend: adherenceRate > 70 ? "up" : adherenceRate > 40 ? "stable" : "down",
			totalSessions: sessions.length,
			completedSessions,
		},
		intensity: {
			avgRpe,
			history: intensityHistory,
			peakIntensity,
		},
		clinical: {
			overallProgress: Math.min(100, overallProgress),
			metricsHistory: clinicalHistory,
		},
	};
}

/**
 * Gera dados mockados para visualização do dashboard
 */
function generateMockData(): EvolutionDashboardMetrics {
	const now = new Date();
	const history = Array.from({ length: 8 }).map((_, i) => {
		const date = new Date();
		date.setDate(now.getDate() - (7 - i) * 3);
		return {
			date: date.toISOString(),
			rpe: Math.floor(Math.random() * 4) + 4, // 4-8
			pain: Math.floor(Math.random() * 3) + 1, // 1-4
		};
	});

	const metricsHistory = Array.from({ length: 12 }).map((_, i) => {
		const date = new Date();
		date.setDate(now.getDate() - (11 - i) * 5);
		return {
			date: date.toISOString(),
			name: i % 2 === 0 ? "ROM Flexão" : "Força Quadríceps",
			value: 90 + i * 2 + Math.random() * 5,
			unit: i % 2 === 0 ? "°" : "kgf",
		};
	});

	return {
		adherence: {
			rate: 85,
			trend: "up",
			totalSessions: 24,
			completedSessions: 21,
		},
		intensity: {
			avgRpe: 6.2,
			history,
			peakIntensity: 9,
		},
		clinical: {
			overallProgress: 72,
			metricsHistory,
		},
	};
}
