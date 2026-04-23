import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "@/api/v2/patients";
import { PatientService } from "@/services/patientService";
import type { Patient, PatientsQueryParams, PatientsPaginatedResult } from "./types";

/**
 * Fetch all patients for the current organization
 * Uses centralized query constants for consistency
 */
export const usePatients = (organizationId?: string | null) => {
	return useQuery({
		queryKey: ["patients", organizationId],
		queryFn: async (): Promise<Patient[]> => {
			if (!organizationId) return [];
			const response = await patientsApi.list({ limit: 200 });
			return (response.data || []).map((p) =>
				PatientService.mapToApp(p),
			) as unknown as Patient[];
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 5,
	});
};

/**
 * Fetch a single patient by ID
 * Uses centralized query constants for consistency
 */
export const usePatient = (id: string | undefined) => {
	return useQuery({
		queryKey: ["patient", id],
		queryFn: async (): Promise<Patient | null> => {
			if (!id) return null;
			const response = await patientsApi.get(id);
			return PatientService.mapToApp(response.data) as unknown as Patient;
		},
		enabled: !!id,
		staleTime: 1000 * 60 * 10,
	});
};

/**
 * Fetch patients with server-side pagination and filtering
 * @param params Query parameters including organizationId, status, searchTerm, pageSize, currentPage
 * @returns Paginated result with data and pagination controls
 */
export const usePatientsPaginated = (
	params: PatientsQueryParams = {},
): PatientsPaginatedResult => {
	const {
		organizationId,
		status,
		searchTerm,
		pageSize = 20,
		currentPage: initialPage = 1,
	} = params;

	const [currentPage, setCurrentPage] = useState(initialPage);

	const queryResult = useQuery({
		queryKey: [
			"patients",
			"paginated",
			organizationId,
			status,
			searchTerm,
			currentPage,
			pageSize,
		],
		queryFn: async (): Promise<{ data: Patient[]; count: number }> => {
			if (!organizationId) return { data: [], count: 0 };

			const response = await patientsApi.list({
				status: status === "all" || status === null ? undefined : status,
				search: searchTerm,
				limit: pageSize,
				offset: (currentPage - 1) * pageSize,
			});

			return {
				data: (response.data || []).map((p) =>
					PatientService.mapToApp(p),
				) as unknown as Patient[],
				count: response.total || 0,
			};
		},
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});

	const totalCount = queryResult.data?.count || 0;
	const data = queryResult.data?.data || [];
	const totalPages = Math.ceil(totalCount / pageSize);

	const nextPage = useCallback(() => {
		if (currentPage < totalPages) {
			setCurrentPage((p) => p + 1);
		}
	}, [currentPage, totalPages]);

	const previousPage = useCallback(() => {
		if (currentPage > 1) {
			setCurrentPage((p) => p - 1);
		}
	}, [currentPage]);

	const goToPage = useCallback(
		(page: number) => {
			const validPage = Math.max(1, Math.min(page, totalPages));
			setCurrentPage(validPage);
		},
		[totalPages],
	);

	return {
		data,
		totalCount,
		currentPage,
		totalPages,
		hasNextPage: currentPage < totalPages,
		hasPreviousPage: currentPage > 1,
		isLoading: queryResult.isLoading,
		error: queryResult.error || null,
		nextPage,
		previousPage,
		goToPage,
		refetch: queryResult.refetch,
	};
};
