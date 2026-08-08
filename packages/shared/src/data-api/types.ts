export interface DataApiConfig {
  connectionString: string;
  patientId: string;
}

export interface DataApiError {
  code: string;
  message: string;
}

export interface PatientProfile {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  nextAppointmentDate: string | null;
}

export interface PatientAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
}

export interface PatientSession {
  id: string;
  date: string;
  duration: number | null;
  homeExercises: any;
  status: string;
}

export interface PatientExercise {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
}

export interface PatientPaymentStatus {
  id: string;
  amount: string | number;
  status: string;
  paidAt: string | null;
  dueDate: string | null;
  source: 'payment' | 'account';
}
