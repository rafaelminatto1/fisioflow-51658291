import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/performance/useDebounce";
import type { PatientsFilters } from "@/hooks/usePatientsPage";

type SearchParamValue = string | string[] | boolean | undefined;

function readArrayParam(searchParams: URLSearchParams, key: string) {
	const values = searchParams.getAll(key).filter(Boolean);
	if (values.length > 0) return values;

	const legacyValue = searchParams.get(key);
	if (!legacyValue) return [];
	return legacyValue
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

export function usePatientsUrlState() {
	const [searchParams, setSearchParams] = useSearchParams();

	const searchParam = searchParams.get("q") || "";
	const statusParam = searchParams.get("status") || "all";
	const conditionParam = searchParams.get("condition") || "all";
	const classificationParam = searchParams.get("classification") || "all";
	const pathologyStatusParam = searchParams.get("pathologyStatus") || "all";
	const paymentModelParam = searchParams.get("paymentModel") || "all";
	const financialStatusParam = searchParams.get("financialStatus") || "all";
	const originParam = searchParams.get("origin") || "all";
	const partnerCompanyParam = searchParams.get("partnerCompany") || "all";
	const sortByParam = searchParams.get("sortBy") || "created_at_desc";
	const hasSurgeryParam = searchParams.get("hasSurgery") === "true";
	const pathologiesParam = readArrayParam(searchParams, "pathologies");
	const careProfilesParam = readArrayParam(searchParams, "careProfiles");
	const sportsParam = readArrayParam(searchParams, "sports");
	const therapyFocusesParam = readArrayParam(searchParams, "therapyFocuses");
	const pageParam = Number.parseInt(searchParams.get("page") || "1", 10);

	const isNewPatientModalOpen = searchParams.get("modal") === "create";
	const showAnalytics = searchParams.get("analytics") === "true";
	const activeTab = (searchParams.get("tab") as "list" | "birthdays") || "list";

	const [searchTerm, setSearchTerm] = useState(searchParam);
	const debouncedSearch = useDebounce(searchTerm, 300);

	useEffect(() => {
		if (searchParam !== searchTerm) {
			setSearchTerm(searchParam);
		}
	}, [searchParam, searchTerm]);

	const filters: PatientsFilters = useMemo(
		() => ({
			search: debouncedSearch,
			status: statusParam,
			condition: conditionParam,
			classification: classificationParam,
			pathologyStatus: pathologyStatusParam,
			pathologies: pathologiesParam,
			careProfiles: careProfilesParam,
			sports: sportsParam,
			therapyFocuses: therapyFocusesParam,
			paymentModel: paymentModelParam,
			financialStatus: financialStatusParam,
			origin: originParam,
			partnerCompany: partnerCompanyParam,
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
			pathologyStatusParam,
			pathologiesParam,
			careProfilesParam,
			sportsParam,
			therapyFocusesParam,
			paymentModelParam,
			financialStatusParam,
			originParam,
			partnerCompanyParam,
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
			pathologyStatus: pathologyStatusParam,
			pathologies: pathologiesParam,
			careProfiles: careProfilesParam,
			sports: sportsParam,
			therapyFocuses: therapyFocusesParam,
			paymentModel: paymentModelParam,
			financialStatus: financialStatusParam,
			origin: originParam,
			partnerCompany: partnerCompanyParam,
			sortBy: sortByParam,
			hasSurgery: hasSurgeryParam,
		}),
		[
			searchParam,
			statusParam,
			conditionParam,
			classificationParam,
			pathologyStatusParam,
			pathologiesParam,
			careProfilesParam,
			sportsParam,
			therapyFocusesParam,
			paymentModelParam,
			financialStatusParam,
			originParam,
			partnerCompanyParam,
			sortByParam,
			hasSurgeryParam,
		],
	);

	useEffect(() => {
		const params = new URLSearchParams(searchParams);
		if (debouncedSearch) {
			params.set("q", debouncedSearch);
		} else {
			params.delete("q");
		}
		if (debouncedSearch !== searchParam) {
			params.set("page", "1");
			setSearchParams(params, { replace: true });
		}
	}, [debouncedSearch, searchParam, searchParams, setSearchParams]);

	const updateSearchParams = useCallback(
		(updates: Record<string, SearchParamValue>) => {
			const params = new URLSearchParams(searchParams);

			for (const [key, rawValue] of Object.entries(updates)) {
				params.delete(key);

				if (
					rawValue === undefined ||
					rawValue === "all" ||
					rawValue === "" ||
					(Array.isArray(rawValue) && rawValue.length === 0)
				) {
					continue;
				}

				if (typeof rawValue === "boolean") {
					if (rawValue) params.set(key, "true");
					continue;
				}

				if (Array.isArray(rawValue)) {
					for (const value of rawValue) {
						if (value) params.append(key, value);
					}
					continue;
				}

				params.set(key, rawValue);
			}

			if (!("page" in updates) && !("q" in updates)) {
				params.set("page", "1");
			}

			setSearchParams(params);
		},
		[searchParams, setSearchParams],
	);

	const handleClearAllFilters = useCallback(() => {
		const preserved = new URLSearchParams();
		if (activeTab !== "list") preserved.set("tab", activeTab);
		if (showAnalytics) preserved.set("analytics", "true");
		setSearchTerm("");
		setSearchParams(preserved);
	}, [activeTab, setSearchParams, showAnalytics]);

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
