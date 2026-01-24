export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'noshow';

export type AppointmentType = 'evaluation' | 'followup' | 'discharge';

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string;
  price?: number;
  paymentStatus?: PaymentStatus;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

export interface Payment {
  id: string;
  patientId: string;
  professionalId: string;
  appointmentId?: string;
  amount: number;
  date: Date;
  method: PaymentMethod;
  status: PaymentStatus;
  description?: string;
  voucherId?: string;
  createdAt: Date;
}

export type PaymentMethod = 'cash' | 'card' | 'pix' | 'transfer';
