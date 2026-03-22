/**
 * usePatientProfileOptimized - Hook otimizado para carregar dados do perfil do paciente
 *
 * OTIMIZAÇÕES:
 * 1. Lazy loading por aba
 * 2. Cache estratégico por tipo de dado
 * 3. Prefetch de abas adjacentes
 * 4. Memoização de valores computados
 *
 * @version 2.0.0 - Performance Optimization
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useCallback, useEffect, useRef } from "react";
import { startTransition } from "react";
import { PatientService } from "@/services/patientService";
import { appointmentsApi, documentsApi } from "@/api/v2";

// Tipos
export type ProfileTab =
	| "overview"
	| "evolucao"
	| "exames"
	| "financeiro"
	| "gamification"
	| "documentos"
	| "analytics";

export interface PatientProfileOptions {
	patientId: string;
	activeTab: ProfileTab;
	prefetchAdjacent?: boolean;
}

// Cache configuration
export const PATIENT_PROFILE_CACHE_CONFIG = {
	// Dados do paciente - mudam raramente
	PATIENT: {
		staleTime: 1000 * 60 * 10, // 10 minutos
		gcTime: 1000 * 60 * 30, // 30 minutos
	},
	// Dados de evolução - mudam durante sessões
	EVOLUTION: {
		staleTime: 1000 * 60 * 5, // 5 minutos
		gcTime: 1000 * 60 * 15, // 15 minutos
	},
	// Documentos - mudam pouco
	DOCUMENTS: {
		staleTime: 1000 * 60 * 15, // 15 minutos
		gcTime: 1000 * 60 * 30, // 30 minutos
	},
	// Financeiro - sensível, cache curto
	FINANCIAL: {
		staleTime: 1000 * 60 * 2, // 2 minutos
		gcTime: 1000 * 60 * 10, // 10 minutos
	},
	// Gamificação - muda frequentemente
	GAMIFICATION: {
		staleTime: 1000 * 60 * 3, // 3 minutos
		gcTime: 1000 * 60 * 10, // 10 minutos
	},
	// Analytics - dados pesados
	ANALYTICS: {
		staleTime: 1000 * 60 * 15, // 15 minutos
		gcTime: 1000 * 60 * 45, // 45 minutos
	},
} as const;

// Query keys factory
export const patientProfileKeys = {
	all: ["patient-profile"] as const,
	patient: (id: string) => [...patientProfileKeys.all, id, "info"] as const,
	evolution: (id: string) =>
		[...patientProfileKeys.all, id, "evolution"] as const,
	documents: (id: string) =>
		[...patientProfileKeys.all, id, "documents"] as const,
	financial: (id: string) =>
		[...patientProfileKeys.all, id, "financial"] as const,
	gamification: (id: string) =>
		[...patientProfileKeys.all, id, "gamification"] as const,
	analytics: (id: string) =>
		[...patientProfileKeys.all, id, "analytics"] as const,
	appointments: (id: string) =>
		[...patientProfileKeys.all, id, "appointments"] as const,
} as const;

/**
 * Dados do paciente (sempe carregado)
 */
function usePatientInfo(patientId: string) {
	return useQuery({
		queryKey: patientProfileKeys.patient(patientId),
		queryFn: async () => {
			const { data, error } = await PatientService.getPatientById(patientId);
			if (error || !data) {
				throw new Error("Paciente não encontrado");
			}
			return data;
		},
		enabled: !!patientId,
		staleTime: PATIENT_PROFILE_CACHE_CONFIG.PATIENT.staleTime,
		gcTime: PATIENT_PROFILE_CACHE_CONFIG.PATIENT.gcTime,
	});
}

/**
 * Próximos agendamentos (carregado na aba overview)
 */
function useUpcomingAppointments(patientId: string, enabled: boolean) {
	return useQuery({
		queryKey: patientProfileKeys.appointments(patientId),
		queryFn: async () => {
			const today = new Date().toISOString().split("T")[0];
			const res = await appointmentsApi.list({
				patientId,
				dateFrom: today,
				limit: 50,
				offset: 0,
			});

			return (res?.data ?? [])
				.filter((a) =>
					["scheduled", "confirmed", "agendado", "confirmado"].includes(
						String(a.status ?? "").toLowerCase(),
					),
				)
				.sort((a, b) => {
					const da = `${a.date ?? ""}T${a.start_time ?? "00:00:00"}`;
					const db = `${b.date ?? ""}T${b.start_time ?? "00:00:00"}`;
					return new Date(da).getTime() - new Date(db).getTime();
				})
				.slice(0, 5);
		},
		enabled: enabled && !!patientId,
		staleTime: PATIENT_PROFILE_CACHE_CONFIG.EVOLUTION.staleTime,
		gcTime: PATIENT_PROFILE_CACHE_CONFIG.EVOLUTION.gcTime,
	});
}

/**
 * Documentos do paciente
 */
function usePatientDocuments(patientId: string, enabled: boolean) {
	return useQuery({
		queryKey: patientProfileKeys.documents(patientId),
		queryFn: async () => {
			const res = await documentsApi.list(patientId);
			return res?.data ?? [];
		},
		enabled: enabled && !!patientId,
		staleTime: PATIENT_PROFILE_CACHE_CONFIG.DOCUMENTS.staleTime,
		gcTime: PATIENT_PROFILE_CACHE_CONFIG.DOCUMENTS.gcTime,
	});
}

/**
 * Dados de gamificação
 */
function usePatientGamification(patientId: string, enabled: boolean) {
	return useQuery({
		queryKey: patientProfileKeys.gamification(patientId),
		queryFn: async () => {
			return {
				points: 0,
				level: 1,
				streak: 0,
				achievements: [],
			};
		},
		enabled: enabled && !!patientId,
		staleTime: PATIENT_PROFILE_CACHE_CONFIG.GAMIFICATION.staleTime,
		gcTime: PATIENT_PROFILE_CACHE_CONFIG.GAMIFICATION.gcTime,
	});
}

/**
 * Hook principal para perfil de paciente otimizado
 */
export function usePatientProfileOptimized(options: PatientProfileOptions) {
	const { patientId, activeTab, prefetchAdjacent = true } = options;
	const queryClient = useQueryClient();
	const prefetchedTabsRef = useRef<Set<ProfileTab>>(new Set());

	// Dados do paciente - sempre carregados
	const patientQuery = usePatientInfo(patientId);

	// Queries condicionais baseadas na aba ativa
	const shouldLoadAppointments = activeTab === "overview";
	const appointmentsQuery = useUpcomingAppointments(
		patientId,
		shouldLoadAppointments,
	);

	const shouldLoadDocuments = activeTab === "documentos";
	const documentsQuery = usePatientDocuments(patientId, shouldLoadDocuments);

	const shouldLoadGamification =
		activeTab === "gamification" || activeTab === "overview";
	const gamificationQuery = usePatientGamification(
		patientId,
		shouldLoadGamification,
	);

	// Prefetch de abas adjacentes
	useEffect(() => {
		if (!patientId || !prefetchAdjacent) return;

		const tabs: ProfileTab[] = [
			"overview",
			"evolucao",
			"exames",
			"financeiro",
			"gamification",
			"documentos",
			"analytics",
		];
		const currentIdx = tabs.indexOf(activeTab);
		const adjacentTabs = [tabs[currentIdx - 1], tabs[currentIdx + 1]].filter(
			Boolean,
		) as ProfileTab[];

		adjacentTabs.forEach((tab) => {
			if (prefetchedTabsRef.current.has(tab)) return;
			prefetchedTabsRef.current.add(tab);

			// Prefetch baseado na aba
			startTransition(() => {
				switch (tab) {
					case "overview":
					case "evolucao":
						queryClient.prefetchQuery({
							queryKey: patientProfileKeys.appointments(patientId),
							staleTime: PATIENT_PROFILE_CACHE_CONFIG.EVOLUTION.staleTime,
						});
						break;
					case "documentos":
						queryClient.prefetchQuery({
							queryKey: patientProfileKeys.documents(patientId),
							staleTime: PATIENT_PROFILE_CACHE_CONFIG.DOCUMENTS.staleTime,
						});
						break;
					case "gamification":
						queryClient.prefetchQuery({
							queryKey: patientProfileKeys.gamification(patientId),
							staleTime: PATIENT_PROFILE_CACHE_CONFIG.GAMIFICATION.staleTime,
						});
						break;
				}
			});
		});
	}, [patientId, activeTab, prefetchAdjacent, queryClient]);

	// Valores memoizados
	const patient = useMemo(() => patientQuery.data, [patientQuery.data]);
	const appointments = useMemo(
		() => appointmentsQuery.data || [],
		[appointmentsQuery.data],
	);
	const documents = useMemo(
		() => documentsQuery.data || [],
		[documentsQuery.data],
	);
	const gamification = useMemo(
		() => gamificationQuery.data,
		[gamificationQuery.data],
	);

	// Estados de loading
	const isLoading = useMemo(
		() => patientQuery.isLoading,
		[patientQuery.isLoading],
	);
	const isLoadingAppointments = useMemo(
		() => appointmentsQuery.isLoading,
		[appointmentsQuery.isLoading],
	);
	const isLoadingDocuments = useMemo(
		() => documentsQuery.isLoading,
		[documentsQuery.isLoading],
	);
	const isLoadingGamification = useMemo(
		() => gamificationQuery.isLoading,
		[gamificationQuery.isLoading],
	);

	// Callbacks
	const invalidateTab = useCallback(
		(tab: ProfileTab) => {
			if (!patientId) return;

			switch (tab) {
				case "overview":
				case "evolucao":
					queryClient.invalidateQueries({
						queryKey: patientProfileKeys.appointments(patientId),
					});
					break;
				case "documentos":
					queryClient.invalidateQueries({
						queryKey: patientProfileKeys.documents(patientId),
					});
					break;
				case "gamification":
					queryClient.invalidateQueries({
						queryKey: patientProfileKeys.gamification(patientId),
					});
					break;
			}
		},
		[patientId, queryClient],
	);

	const refetchAll = useCallback(() => {
		patientQuery.refetch();
	}, [patientQuery]);

	return {
		// Dados
		patient,
		appointments,
		documents,
		gamification,

		// Estados de loading
		isLoading,
		isLoadingAppointments,
		isLoadingDocuments,
		isLoadingGamification,

		// Erros
		error: patientQuery.error,

		// Métodos
		invalidateTab,
		refetchAll,

		// Query keys
		queryKeys: patientProfileKeys,
	};
}

/**
 * Hook para prefetch de dados de paciente em listas
 * Deve ser usado em componentes de lista para prefetch
 * dados dos pacientes antes de abrir o perfil
 */
export function usePatientProfilePrefetch() {
	const queryClient = useQueryClient();
	const prefetchQueueRef = useRef<Set<string>>(new Set());

	const prefetchPatientData = useCallback(
		(patientId: string) => {
			if (prefetchQueueRef.current.has(patientId)) return;
			prefetchQueueRef.current.add(patientId);

			// Prefetch em paralelo
			startTransition(() => {
				queryClient.prefetchQuery({
					queryKey: patientProfileKeys.patient(patientId),
					staleTime: PATIENT_PROFILE_CACHE_CONFIG.PATIENT.staleTime,
				});
				queryClient.prefetchQuery({
					queryKey: patientProfileKeys.appointments(patientId),
					staleTime: PATIENT_PROFILE_CACHE_CONFIG.EVOLUTION.staleTime,
				});
			});
		},
		[queryClient],
	);

	return { prefetchPatientData };
}
