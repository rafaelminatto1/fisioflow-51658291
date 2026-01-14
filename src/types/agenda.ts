import type { AppointmentStatus } from './appointment';

// Agenda System Types
export type SessionStatus = AppointmentStatus;
export type PaymentStatus = 'pending' | 'paid' | 'partial';
export type SessionType = 'individual' | 'group';
export type PaymentType = 'session' | 'package';
export type PaymentMethod = 'cash' | 'card' | 'pix' | 'transfer';
export type UserRole = 'admin' | 'therapist' | 'intern' | 'patient';

// Base Appointment interface
export interface Appointment {
  id: string;
  patient_id: string;
  therapist_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  status: SessionStatus;
  payment_status: PaymentStatus;
  session_type: SessionType;
  notes: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos (populated via joins)
  patient?: Patient;
  therapist?: User;
  payments?: Payment[];
}

// Extended Patient interface for agenda
export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  session_price: number;
  package_sessions: number;
  remaining_sessions: number;
  important_notes: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Payment interface
export interface Payment {
  id: string;
  appointment_id: string;
  amount: number;
  payment_type: PaymentType;
  sessions_count?: number; // For package payments
  payment_method: PaymentMethod;
  paid_at: string;
  notes: string;
  created_at: string;
}

// User interface (for therapist relationship)
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

// Status configuration for UI
export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  twBg: string;
  twBorder: string;
  twText: string;
  icon?: any; // Lucide icon type
  allowedActions: string[];
}

// Permission configuration by role
export interface RolePermissions {
  canCreateAppointment: boolean;
  canEditAppointment: boolean;
  canDeleteAppointment: boolean;
  canViewAllAppointments: boolean;
  canManagePayments: boolean;
  canAccessFinancialData: boolean;
  canMarkSessionStatus: boolean;
  canAccessEvolutions: boolean;
}

// Appointment creation/update DTOs
export interface CreateAppointmentData {
  patient_id: string;
  therapist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  notes?: string;
}

export interface UpdateAppointmentData {
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: SessionStatus;
  payment_status?: PaymentStatus;
  session_type?: SessionType;
  notes?: string;
}

// Payment creation DTO
export interface CreatePaymentData {
  appointment_id: string;
  amount: number;
  payment_type: PaymentType;
  sessions_count?: number;
  payment_method: PaymentMethod;
  notes?: string;
}

// Agenda filter options
export interface AgendaFilters {
  therapist_id?: string;
  status?: SessionStatus[];
  payment_status?: PaymentStatus[];
  date_from?: string;
  date_to?: string;
}

// Weekly calendar data structure
export interface WeeklyCalendarData {
  weekStart: Date;
  weekEnd: Date;
  appointments: Appointment[];
  timeSlots: string[]; // Array of time slots (e.g., ['07:00', '07:30', ...])
}