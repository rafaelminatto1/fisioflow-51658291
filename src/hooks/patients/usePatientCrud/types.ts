export interface Patient {
  id: string;
  full_name: string;
  name?: string; // Alias for full_name
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  gender?: "masculino" | "feminino" | "outro" | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  emergency_contact?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_phone?: string | null;
  observations?: string | null;
  medical_history?: string | null;
  main_condition?: string | null;
  main_condition_legacy?: string | null;
  health_insurance?: string | null;
  insurance_number?: string | null;
  status?: string | null;
  progress?: number | null;
  allergies?: string | null;
  medications?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  blood_type?: string | null;
  marital_status?: string | null;
  profession?: string | null;
  education_level?: string | null;
  origin?: string | null;
  referred_by?: string | null;
  care_profiles?: string[] | null;
  sports_practiced?: string[] | null;
  therapy_focuses?: string[] | null;
  payer_model?: string | null;
  partner_company_name?: string | null;
  consent_data?: boolean | null;
  consent_image?: boolean | null;
  incomplete_registration?: boolean | null;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatientCreateInput {
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date: string;
  gender: "masculino" | "feminino" | "outro";
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  emergency_contact?: string;
  emergency_contact_relationship?: string;
  emergency_phone?: string;
  medical_history?: string;
  main_condition: string;
  health_insurance?: string;
  insurance_number?: string;
  allergies?: string;
  medications?: string;
  weight_kg?: number;
  height_cm?: number;
  blood_type?: string;
  marital_status?: string;
  profession?: string;
  education_level?: string;
  origin?: string;
  referred_by?: string;
  care_profiles?: string[];
  sports_practiced?: string[];
  therapy_focuses?: string[];
  payer_model?: string;
  partner_company_name?: string;
  observations?: string;
  organization_id: string;
  referring_doctor_name?: string;
  referring_doctor_phone?: string;
  medical_return_date?: string;
}

export interface PatientUpdateInput extends Partial<
  Omit<PatientCreateInput, "organization_id" | "birth_date">
> {
  birth_date?: string;
  status?: "Inicial" | "Em Tratamento" | "Recuperação" | "Concluído";
  progress?: number;
  consent_data?: boolean;
  consent_image?: boolean;
  incomplete_registration?: boolean;
  referring_doctor_name?: string;
  referring_doctor_phone?: string;
  medical_return_date?: string;
  medical_report_done?: boolean;
  medical_report_sent?: boolean;
}

export interface PatientsQueryParams {
  organizationId?: string | null;
  status?: string | null;
  searchTerm?: string;
  pageSize?: number;
  currentPage?: number;
}

export interface PatientsPaginatedResult {
  data: Patient[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  error: Error | null;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  refetch: () => void;
}
