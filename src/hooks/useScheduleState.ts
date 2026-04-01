import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CalendarViewType } from "@/types/agenda";
import { useDebounce } from "@/hooks/use-debounce";

export interface ScheduleFilters {
	status: string[];
	types: string[];
	therapists: string[];
}

export function useScheduleState() {
	const [searchParams, setSearchParams] = useSearchParams();
	const isMobile = useIsMobile();

	// --- Initial State Parsing ---
	const viewFromUrl = searchParams.get("view") as CalendarViewType | null;
	const dateFromUrl = searchParams.get("date");

	const parsedDate = dateFromUrl
		? (() => {
				const d = parseISO(dateFromUrl);
				return isNaN(d.getTime()) ? null : d;
			})()
		: null;

	// --- States ---
	const [currentDate, setCurrentDate] = useState<Date>(
		() => parsedDate || new Date(),
	);

	const [viewType, setViewType] = useState<CalendarViewType>(() => {
		if (
			viewFromUrl === "day" ||
			viewFromUrl === "week" ||
			viewFromUrl === "month"
		)
			return viewFromUrl;
		if (typeof window !== "undefined") {
			return window.innerWidth < 768 ? "day" : "week";
		}
		return isMobile ? "day" : "week";
	});

	const [filters, setFilters] = useState<ScheduleFilters>(() => {
		const statusParam = searchParams.get("status");
		const typesParam = searchParams.get("types");
		const therapistsParam = searchParams.get("therapists");

		return {
			status: statusParam ? statusParam.split(",") : [],
			types: typesParam ? typesParam.split(",") : [],
			therapists: therapistsParam ? therapistsParam.split(",") : [],
		};
	});

	const [patientFilter, setPatientFilter] = useState<string | null>(
		() => searchParams.get("patient") || null,
	);

	// --- URL Synchronization with Debounce ---
	// We use debounce to avoid polluting history when navigating rapidly
	const debouncedCurrentDate = useDebounce(currentDate, 300);
	const debouncedViewType = useDebounce(viewType, 300);
	const debouncedFilters = useDebounce(filters, 500);
	const debouncedPatientFilter = useDebounce(patientFilter, 500);

	useEffect(() => {
		const params: Record<string, string> = {};
		const defaultView = isMobile ? "day" : "week";
		const todayStr = format(new Date(), "yyyy-MM-dd");
		const currentDateStr = format(debouncedCurrentDate, "yyyy-MM-dd");

		if (debouncedViewType !== defaultView) {
			params.view = debouncedViewType;
		}

		if (currentDateStr !== todayStr) {
			params.date = currentDateStr;
		}

		if (debouncedFilters.status.length > 0) {
			params.status = debouncedFilters.status.join(",");
		}

		if (debouncedFilters.types.length > 0) {
			params.types = debouncedFilters.types.join(",");
		}

		if (debouncedFilters.therapists.length > 0) {
			params.therapists = debouncedFilters.therapists.join(",");
		}

		if (debouncedPatientFilter) {
			params.patient = debouncedPatientFilter;
		}

		// Preserve other potential search params (like ?edit=)
		const editParam = searchParams.get("edit");
		if (editParam) params.edit = editParam;

		setSearchParams(params, { replace: true });
	}, [
		debouncedCurrentDate,
		debouncedViewType,
		debouncedFilters,
		debouncedPatientFilter,
		isMobile,
		setSearchParams,
		searchParams,
	]);

	// Force day view on mobile if somehow month is selected
	useEffect(() => {
		if (isMobile && viewType === "month") {
			setViewType("day");
		}
	}, [isMobile, viewType]);

	const clearFilters = useCallback(() => {
		setFilters({ status: [], types: [], therapists: [] });
		setPatientFilter(null);
	}, []);

	return {
		currentDate,
		setCurrentDate,
		viewType,
		setViewType,
		filters,
		setFilters,
		patientFilter,
		setPatientFilter,
		clearFilters,
	};
}
