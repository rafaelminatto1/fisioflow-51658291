import type { PatientGoal as GoalApiRow } from "@/api/v2";
import type { PatientGoal } from "@/types/evolution";

function readGoalMetadata(row: GoalApiRow): Record<string, unknown> {
	const metadata = row.metadata;
	if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
		return {};
	return metadata as Record<string, unknown>;
}

function metadataString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;
}

function metadataNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number.parseFloat(value.trim().replace(",", "."));
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function normalizeGoalStatus(value?: string | null): PatientGoal["status"] {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase();
	if (["concluido", "concluído", "completed", "done"].includes(normalized))
		return "concluido";
	if (["cancelado", "cancelled", "canceled"].includes(normalized))
		return "cancelado";
	return "em_andamento";
}

function normalizeGoalPriority(value?: string | null): PatientGoal["priority"] {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase();
	if (["baixa", "low"].includes(normalized)) return "baixa";
	if (["alta", "high"].includes(normalized)) return "alta";
	if (["critica", "crítica", "critical"].includes(normalized)) return "critica";
	return "media";
}

export function normalizeGoalRow(row: GoalApiRow): PatientGoal {
	const metadata = readGoalMetadata(row);
	const goalTitle =
		metadataString(metadata.goal_title) ?? row.description ?? "Meta";

	return {
		id: row.id,
		patient_id: row.patient_id,
		goal_title: goalTitle,
		goal_description: metadataString(metadata.goal_description),
		category: metadataString(metadata.category),
		target_date: row.target_date ?? undefined,
		target_value: metadataString(metadata.target_value),
		current_value: metadataString(metadata.current_value),
		current_progress: metadataNumber(metadata.current_progress) ?? 0,
		priority: normalizeGoalPriority(row.priority),
		status: normalizeGoalStatus(row.status),
		completed_at: row.achieved_at ?? undefined,
		created_by: "",
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

export function normalizeGoalRows(
	rows: GoalApiRow[] | null | undefined,
): PatientGoal[] {
	return (rows ?? []).map(normalizeGoalRow);
}
