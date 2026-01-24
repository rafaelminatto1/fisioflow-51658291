export interface Patient {
  id: string;
  name: string;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  address?: any | null; // Json
  emergency_contact?: any | null; // Json
  medical_history?: string | null;
  main_condition?: string | null;
  status: 'Inicial' | 'Em_Tratamento' | 'Recuperacao' | 'Concluido';
  progress: number;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  date: string; // ISO string
  status: 'Agendado' | 'Confirmado' | 'Concluido' | 'Cancelado';
  type: string;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_group?: string;
  video_url?: string;
  instructions?: string;
  is_active: boolean;
}