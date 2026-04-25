export type SoapStatus = "draft" | "finalized" | "cancelled";

export const soapKeys = {
	all: ["soap-records"] as const,
	lists: () => [...soapKeys.all, "list"] as const,
	list: (
		patientId: string,
		filters?: { status?: SoapStatus; limit?: number },
	) => [...soapKeys.lists(), patientId, filters] as const,
	details: () => [...soapKeys.all, "detail"] as const,
	detail: (id: string) => [...soapKeys.details(), id] as const,
	drafts: (patientId: string) =>
		[...soapKeys.all, "drafts", patientId] as const,
	templates: (therapistId?: string) =>
		[...soapKeys.all, "templates", therapistId] as const,
	attachments: (soapRecordId?: string, patientId?: string) =>
		[...soapKeys.all, "attachments", soapRecordId, patientId] as const,
} as const;

export class SoapOperationError extends Error {
	constructor(
		message: string,
		public code?: string,
		public originalError?: unknown,
	) {
		super(message);
		this.name = "SoapOperationError";
	}
}

export interface SoapRecordV2 {
	id: string;
	patientId: string;
	recordDate: string;
	subjective: string;
	objective: string;
	assessment: string;
	plan: string;
	createdAt: string;
	createdBy: string;
}

export interface SoapRecord {
	id: string;
	patient_id: string;
	appointment_id?: string;
	session_number?: number;
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
	status: SoapStatus;
	pain_level?: number;
	pain_location?: string;
	pain_character?: string;
	duration_minutes?: number;
	last_auto_save_at?: string;
	finalized_at?: string;
	finalized_by?: string;
	record_date: string;
	created_by: string;
	created_at: string;
	updated_at: string;
	signed_at?: string;
	signature_hash?: string;
}

export interface CreateSoapRecordData {
	patient_id: string;
	appointment_id?: string;
	subjective?: string;
	objective?: string;
	assessment?: string;
	plan?: string;
	status?: SoapStatus;
	pain_level?: number;
	pain_location?: string;
	pain_character?: string;
	duration_minutes?: number;
	record_date?: string;
}

export interface UpdateSoapRecordData extends Partial<CreateSoapRecordData> {
	status?: SoapStatus;
}

export type SessionAttachmentCategory =
	| "exam"
	| "imaging"
	| "document"
	| "before_after"
	| "other";

export type SessionAttachmentFileType =
	| "pdf"
	| "jpg"
	| "png"
	| "docx"
	| "other";

export interface SessionAttachment {
	id: string;
	soap_record_id?: string;
	patient_id: string;
	file_name: string;
	original_name?: string;
	file_url: string;
	thumbnail_url?: string;
	file_type: SessionAttachmentFileType;
	mime_type?: string;
	category: SessionAttachmentCategory;
	size_bytes?: number;
	description?: string;
	uploaded_by?: string;
	uploaded_at: string;
}

export interface SessionTemplate {
	id: string;
	organization_id?: string;
	therapist_id?: string;
	name: string;
	description?: string;
	subjective?: string;
	objective?: Record<string, unknown>;
	assessment?: string;
	plan?: Record<string, unknown>;
	is_global: boolean;
	created_at: string;
	updated_at: string;
}
