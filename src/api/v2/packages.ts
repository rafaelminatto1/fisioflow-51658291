import { request } from "./base";

export interface SessionPackage {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  total_sessions: number;
  price: number;
  price_per_session: number;
  valid_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientPackage {
  id: string;
  organization_id: string;
  patient_id: string;
  package_id: string;
  package_name: string;
  package_total_sessions: number;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  amount_paid: number;
  payment_method?: string;
  purchase_date: string;
  expiry_date?: string;
  status: "ativo" | "esgotado" | "expirado" | "cancelado";
  notes?: string;
  financial_record_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PackageStats {
  active_packages: number;
  exhausted_packages: number;
  total_remaining_sessions: number;
  total_revenue: number;
  patients_with_packages: number;
}

export const packagesApi = {
  // Catálogo
  list: (is_active?: boolean) =>
    request<{ data: SessionPackage[] }>(
      `/api/packages${is_active !== undefined ? `?is_active=${is_active}` : ""}`,
    ),

  create: (data: {
    name: string;
    description?: string;
    total_sessions: number;
    price: number;
    valid_days?: number;
  }) =>
    request<{ data: SessionPackage }>("/api/packages", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{
    name: string;
    description: string;
    total_sessions: number;
    price: number;
    valid_days: number;
    is_active: boolean;
  }>) =>
    request<{ data: SessionPackage }>(`/api/packages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deactivate: (id: string) =>
    request<{ success: boolean }>(`/api/packages/${id}`, { method: "DELETE" }),

  // Pacotes de paciente
  patientPackages: (patientId: string) =>
    request<{ data: PatientPackage[] }>(`/api/packages/patient/${patientId}`),

  sell: (data: {
    patient_id: string;
    package_id: string;
    amount_paid: number;
    payment_method?: string;
    notes?: string;
    financial_record_id?: string;
  }) =>
    request<{ data: PatientPackage }>("/api/packages/sell", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  useSession: (patientPackageId: string, data?: { appointment_id?: string; notes?: string }) =>
    request<{ data: PatientPackage }>(`/api/packages/patient-package/${patientPackageId}/use`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),

  stats: () => request<{ data: PackageStats }>("/api/packages/stats"),
};
