export interface BoardColumn {
	id: string;
	board_id: string;
	name: string;
	color?: string;
	wip_limit?: number | null;
	order_index: number;
	created_at: string;
}

export interface Board {
	id: string;
	name: string;
	description?: string | null;
	organization_id?: string | null;
	background_color?: string;
	background_image?: string | null;
	icon?: string;
	is_starred: boolean;
	is_archived: boolean;
	created_by: string;
	created_at: string;
	updated_at: string;
	columns: BoardColumn[];
	task_count?: number;
}

export const BOARD_PRESET_COLORS = [
	{ label: "Azul Trello", value: "#0079BF" },
	{ label: "Verde", value: "#519839" },
	{ label: "Laranja", value: "#D29034" },
	{ label: "Vermelho", value: "#B04632" },
	{ label: "Roxo", value: "#89609E" },
	{ label: "Rosa", value: "#CD5A91" },
	{ label: "Teal", value: "#4BBF6B" },
	{ label: "Cinza", value: "#838C91" },
] as const;

export const COLUMN_COLORS = [
	"#E2E8F0",
	"#BEE3F8",
	"#C6F6D5",
	"#FEFCBF",
	"#FED7D7",
	"#E9D8FD",
	"#FED7E2",
	"#FEEBC8",
] as const;

// ============================================================
// BOARD LABELS (etiquetas coloridas)
// ============================================================

export interface BoardLabel {
	id: string;
	board_id: string;
	organization_id?: string;
	name: string;
	color: string;
	description?: string;
	is_active: boolean;
	order_index: number;
	created_at?: string;
}

/** 10 cores preset para etiquetas clínicas */
export const LABEL_PRESET_COLORS = [
	{ label: "Vermelho urgente", value: "#EF4444" },
	{ label: "Laranja alta prioridade", value: "#F97316" },
	{ label: "Amarelo médio", value: "#EAB308" },
	{ label: "Verde concluído", value: "#22C55E" },
	{ label: "Azul fisio", value: "#3B82F6" },
	{ label: "Roxo TO", value: "#8B5CF6" },
	{ label: "Cyan aquático", value: "#06B6D4" },
	{ label: "Rosa", value: "#EC4899" },
	{ label: "Cinza admin", value: "#6B7280" },
	{ label: "Preto", value: "#1E293B" },
] as const;

// ============================================================
// BOARD CHECKLIST TEMPLATES
// ============================================================

export interface ChecklistTemplateItem {
	text: string;
	assignee_role?: string;
	due_offset_days?: number;
}

export interface BoardChecklistTemplate {
	id: string;
	board_id?: string | null;
	organization_id?: string;
	name: string;
	description?: string;
	items: ChecklistTemplateItem[];
	category?: string;
	usage_count: number;
	created_by?: string;
	created_at?: string;
}

// ============================================================
// BOARD AUTOMATIONS (motor de regras opt-in)
// ============================================================

export type AutomationTriggerType =
	| "status_changed"
	| "label_added"
	| "label_removed"
	| "checklist_completed"
	| "task_created"
	| "due_date_approaching";

export interface AutomationTrigger {
	type: AutomationTriggerType;
	/** Para status_changed */
	from?: string;
	to?: string;
	/** Para label_added/removed */
	label_id?: string;
	/** Para due_date_approaching */
	days_before?: number;
}

export type AutomationActionType =
	| "change_status"
	| "assign_label"
	| "remove_label"
	| "assign_user"
	| "send_notification"
	| "create_task";

export interface AutomationAction {
	type: AutomationActionType;
	/** change_status */
	column_id?: string;
	status?: string;
	/** assign_label / remove_label */
	label_id?: string;
	/** assign_user */
	user_id?: string;
	/** send_notification */
	message?: string;
	channel?: "inapp" | "whatsapp";
	/** create_task */
	titulo?: string;
}

export interface AutomationCondition {
	field: string;
	operator: "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
	value?: unknown;
}

export interface BoardAutomation {
	id: string;
	board_id: string;
	organization_id?: string;
	name: string;
	description?: string;
	is_active: boolean;
	trigger: AutomationTrigger;
	conditions: AutomationCondition[];
	actions: AutomationAction[];
	execution_count: number;
	last_executed_at?: string | null;
	created_by?: string;
	created_at?: string;
	updated_at?: string;
}
