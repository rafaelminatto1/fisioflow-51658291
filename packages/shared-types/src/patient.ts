export interface Patient {
  id: string;
  userId: string;
  professionalId: string;
  name: string;
  birthDate: string;
  cpf?: string;
  phone?: string;
  email?: string;
  photoURL?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  medicalHistory?: MedicalHistoryEntry[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface MedicalHistoryEntry {
  date: Date;
  condition: string;
  description?: string;
  medications?: string[];
}
