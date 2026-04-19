import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/performance/useDebounce";
import { type PatientsFilters } from "@/hooks/usePatientsPage";

export function usePatientsUrlState() {
	const [searchParams, setSearchParams] = useSearchParams();

	const searchParam = searchParams.get("q") || "";
	const statusParam = searchParams.get("status") || "all";
	const conditionParam = searchParams.get("condition") || "all";
	const classificationParam = searchParams.get("classification") || "all";
	const sortByParam = searchParams.get("sortBy") || "created_at_desc";
	const hasSurgeryParam = searchParams.get("hasSurgery") === "true";
	const pageParam = parseInt(searchParams.get("page") || "1", 10);
	
	const isNewPatientModalOpen = searchParams.get("modal") === "create";
	const showAnalytics = searchParams.get("analytics") === "true";
	const activeTab = (searchParams.get("tab") as "list" | "birthdays") || "list";

	const [searchTerm, setSearchTerm] = useState(searchParam);
	const debouncedSearch = useDebounce(searchTerm, 300);

	const filters: PatientsFilters = useMemo(
		() => ({
			search: debouncedSearch,
			status: statusParam,
			condition: conditionParam,
			classification: classificationParam,
			sortBy: sortByParam,
			hasSurgery: hasSurgeryParam,
			page: pageParam,
			pageSize: 20,
		}),
		[
			debouncedSearch,
			statusParam,
			conditionParam,
			classificationParam,
			sortByParam,
			hasSurgeryParam,
			pageParam,
		],
	);

	const filtersState = useMemo(
		() => ({
			search: searchParam,
			status: statusParam,
			condition: conditionParam,
			classification: classificationParam,
			sortBy: sortByParam,
			hasSurgery: hasSurgeryParam,
		}),
		[searchParam, statusParam, conditionParam, classificationParam, sortByParam, hasSurgeryParam],
	);

	// Sync debounced search to URL
	useEffect(() => {
		const params = new URLSearchParams(searchParams);
		if (debouncedSearch) {
			params.set("q", debouncedSearch);
		} else {
			params.delete("q");
		}
		if (debouncedSearch !== searchParam) {
			params.set("page", "1"); // Reset page on search change
			setSearchParams(params, { replace: true });
		}
	}, [debouncedSearch, searchParam, setSearchParams, searchParams]);

	const updateSearchParams = useCallback((updates: Record<string, string | undefined>) => {
		const params = new URLSearchParams(searchParams);
		Object.entries(updates).forEach(([key, value]) => {
			if (value === undefined || value === "all") {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		});

		// Reset page when filtering, unless explicitly setting page
		if (updates.page === undefined && !updates.q) {
			params.set("page", "1");
		}

		setSearchParams(params);
	}, [searchParams, setSearchParams]);

	const handleClearAllFilters = useCallback(() => {
		setSearchTerm("");
		setSearchParams(new URLSearchParams());
	}, [setSearchParams]);

	return {
		filters,
		filtersState,
		searchTerm,
		setSearchTerm,
		updateSearchParams,
		handleClearAllFilters,
		isNewPatientModalOpen,
		showAnalytics,
		activeTab,
		pageParam,
	};
}
