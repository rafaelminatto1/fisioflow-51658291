export type PatientFilters = {
	classification?: string;
	hasSurgery?: boolean;
	pathologyStatus?: string;
	pathologies?: string[];
	careProfiles?: string[];
	sports?: string[];
	therapyFocuses?: string[];
	paymentModel?: string;
	financialStatus?: string;
	origin?: string;
	partnerCompany?: string;
};

export function countActiveFilters(filters: PatientFilters): number {
	let count = 0;

	if (filters.classification && filters.classification !== "all") count += 1;
	if (filters.hasSurgery) count += 1;
	if (filters.pathologyStatus && filters.pathologyStatus !== "all") count += 1;
	if (filters.paymentModel && filters.paymentModel !== "all") count += 1;
	if (filters.financialStatus && filters.financialStatus !== "all") count += 1;
	if (filters.origin && filters.origin !== "all") count += 1;
	if (filters.partnerCompany && filters.partnerCompany !== "all") count += 1;
	if (filters.pathologies?.length) count += 1;
	if (filters.careProfiles?.length) count += 1;
	if (filters.sports?.length) count += 1;
	if (filters.therapyFocuses?.length) count += 1;

	return count;
}

export function matchesFilters(): boolean {
	return true;
}
