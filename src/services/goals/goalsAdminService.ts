/**
 * Goals Admin Service — Cloudflare Workers + Neon
 */
import { goalProfilesApi, type GoalProfileRow } from "@/lib/api/workers-client";
import { GoalProfile, GoalTarget } from "@/lib/goals/goalProfiles.seed";

export type { GoalProfileRow };

export interface ProfileListItem {
	id: string;
	name: string;
	description: string;
	status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
	version: number;
	published_at: string | null;
	updated_at: string;
	created_at: string;
}

export interface ProfileDetail extends ProfileListItem {
	applicable_tests: string[];
	quality_gate: unknown;
	evidence: unknown[];
	tags: string[];
	targets: GoalTarget[];
}

function rowToListItem(row: GoalProfileRow): ProfileListItem {
	return {
		id: row.id,
		name: row.name,
		description: row.description ?? "",
		status: row.status,
		version: row.version,
		published_at: row.published_at ?? null,
		updated_at: row.updated_at,
		created_at: row.created_at,
	};
}

function rowToDetail(row: GoalProfileRow): ProfileDetail {
	return {
		...rowToListItem(row),
		applicable_tests: row.applicable_tests ?? [],
		quality_gate: row.quality_gate,
		evidence: row.evidence ?? [],
		tags: row.tags ?? [],
		targets: (row.targets ?? []) as GoalTarget[],
	};
}

export const goalsAdminService = {
	async listProfiles(): Promise<ProfileListItem[]> {
		const res = await goalProfilesApi.list();
		return (res.data ?? []).map(rowToListItem);
	},

	async getProfile(id: string): Promise<ProfileDetail> {
		const res = await goalProfilesApi.get(id);
		return rowToDetail(res.data);
	},

	async createProfile(
		id: string,
		name: string,
		description: string,
	): Promise<GoalProfile> {
		const res = await goalProfilesApi.create({ id, name, description });
		const row = res.data;
		return {
			id: row.id,
			name: row.name,
			description: row.description ?? "",
			applicableTests: (row.applicable_tests as any[]) ?? [],
			targets: (row.targets ?? []) as GoalTarget[],
			tags: row.tags ?? [],
		} as GoalProfile;
	},

	async updateProfile(
		id: string,
		updates: Partial<GoalProfile>,
	): Promise<GoalProfile> {
		const payload: Record<string, unknown> = {};
		if (updates.name !== undefined) payload.name = updates.name;
		if (updates.description !== undefined)
			payload.description = updates.description;
		if (updates.applicableTests !== undefined)
			payload.applicable_tests = updates.applicableTests;
		if (updates.qualityGate !== undefined)
			payload.quality_gate = updates.qualityGate;
		if (updates.targets !== undefined) payload.targets = updates.targets;
		if (updates.clinicianNotesTemplate !== undefined)
			payload.clinician_notes_template = updates.clinicianNotesTemplate;
		if (updates.patientNotesTemplate !== undefined)
			payload.patient_notes_template = updates.patientNotesTemplate;
		if (updates.evidence !== undefined) payload.evidence = updates.evidence;
		if (updates.defaultPinnedMetricKeys !== undefined)
			payload.default_pinned_metric_keys = updates.defaultPinnedMetricKeys;
		if (updates.tags !== undefined) payload.tags = updates.tags;

		const res = await goalProfilesApi.update(id, payload);
		const row = res.data;
		return {
			id: row.id,
			name: row.name,
			description: row.description ?? "",
			applicableTests: (row.applicable_tests as any[]) ?? [],
			targets: (row.targets ?? []) as GoalTarget[],
			tags: row.tags ?? [],
		} as GoalProfile;
	},

	async publishProfile(id: string): Promise<GoalProfile> {
		const res = await goalProfilesApi.publish(id);
		const row = res.data;
		return {
			id: row.id,
			name: row.name,
			description: row.description ?? "",
			applicableTests: (row.applicable_tests as any[]) ?? [],
			targets: (row.targets ?? []) as GoalTarget[],
			tags: row.tags ?? [],
		} as GoalProfile;
	},
};
