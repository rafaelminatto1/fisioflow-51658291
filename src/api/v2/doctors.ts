import { request } from "./base";

export interface DoctorRow {
	id: string;
	organization_id: string;
	name: string;
	specialty: string | null;
	crm: string | null;
	crm_state: string | null;
	phone: string | null;
	email: string | null;
	clinic_name: string | null;
	clinic_address: string | null;
	clinic_phone: string | null;
	notes: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export const doctorsApi = {
	list: (params?: { search?: string; limit?: number; offset?: number }) => {
		const qs = new URLSearchParams(
			Object.fromEntries(
				Object.entries(params ?? {})
					.filter(([, v]) => v != null)
					.map(([k, v]) => [k, String(v)]),
			),
		).toString();
		return request<{ data: DoctorRow[]; total: number }>(
			`/api/doctors${qs ? `?${qs}` : ""}`,
		);
	},
	get: (id: string) => request<{ data: DoctorRow }>(`/api/doctors/${id}`),
	create: (data: Partial<DoctorRow>) =>
		request<{ data: DoctorRow }>("/api/doctors", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (id: string, data: Partial<DoctorRow>) =>
		request<{ data: DoctorRow }>(`/api/doctors/${id}`, {
			method: "PUT",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		request<{ success: boolean }>(`/api/doctors/${id}`, { method: "DELETE" }),
};
