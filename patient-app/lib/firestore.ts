import { patientApi, api } from './api';
import { log } from '@/lib/logger';

// ============================================
// TYPES (Mantidos por compatibilidade)
// ============================================

export interface Patient {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  condition?: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName?: string;
  type: string;
  date: Date;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  instructions?: string[];
  sets: number;
  reps: number;
  duration?: number;
  videoUrl?: string;
  imageUrl?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdBy: string;
}

export interface ExerciseAssignment {
  id: string;
  patientId: string;
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  completed: boolean;
  completedAt?: Date;
  progress: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'appointment' | 'exercise' | 'message' | 'system';
  read: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}

// ============================================
// HELPERS
// ============================================

function parseDate(val: any): Date {
  if (!val) return new Date();
  return new Date(val);
}

// ============================================
// PATIENT DATA (Migrated to REST)
// ============================================

export async function getPatientProfile(_userId: string): Promise<Patient | null> {
  try {
    const data = await patientApi.getProfile();
    return {
      ...data,
      createdAt: parseDate(data.createdAt || data.created_at),
      updatedAt: parseDate(data.updatedAt || data.updated_at),
    };
  } catch (error) {
    log.error('Error fetching patient profile:', error);
    return null;
  }
}

export async function updatePatientProfile(
  _userId: string,
  data: Partial<Patient>
): Promise<void> {
  try {
    await patientApi.updateProfile(data);
  } catch (error) {
    log.error('Error updating patient profile:', error);
    throw error;
  }
}

// ============================================
// APPOINTMENTS (Migrated to REST)
// ============================================

export async function getPatientAppointments(
  _patientId: string,
  options?: { upcoming?: boolean; limit?: number }
): Promise<Appointment[]> {
  try {
    const data = await patientApi.getAppointments(options?.upcoming);
    return data.map((item: any) => ({
      ...item,
      date: parseDate(item.date),
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt),
    }));
  } catch (error) {
    log.error('Error fetching appointments:', error);
    return [];
  }
}

/**
 * Nota: Subscriptions em tempo real (onSnapshot) são substituídas por
 * fetch simples. No futuro, usar WebSockets ou TanStack Query com polling.
 */
export function subscribeToAppointments(
  patientId: string,
  callback: (appointments: Appointment[]) => void
): () => void {
  // Chamada inicial
  getPatientAppointments(patientId).then(callback);
  
  // Mock de intervalo para simular "realtime" sem Firebase
  const interval = setInterval(() => {
    getPatientAppointments(patientId).then(callback);
  }, 30000);

  return () => clearInterval(interval);
}

export async function confirmAppointment(appointmentId: string): Promise<void> {
  try {
    await patientApi.confirmAppointment(appointmentId);
  } catch (error) {
    log.error('Error confirming appointment:', error);
    throw error;
  }
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  try {
    await patientApi.cancelAppointment(appointmentId);
  } catch (error) {
    log.error('Error cancelling appointment:', error);
    throw error;
  }
}

// ============================================
// EXERCISES (Migrated to REST)
// ============================================

export async function getPatientExercises(_patientId: string): Promise<ExerciseAssignment[]> {
  try {
    const data = await patientApi.getExercises();
    return data.map((item: any) => ({
      ...item,
      startDate: parseDate(item.startDate),
      completedAt: item.completedAt ? parseDate(item.completedAt) : undefined,
    }));
  } catch (error) {
    log.error('Error fetching exercises:', error);
    return [];
  }
}

export async function markExerciseCompleted(
  assignmentId: string,
  completed: boolean
): Promise<void> {
  try {
    await patientApi.completeExercise(assignmentId, { completed });
  } catch (error) {
    log.error('Error updating exercise:', error);
    throw error;
  }
}

export async function updateExerciseProgress(
  assignmentId: string,
  progress: number
): Promise<void> {
  try {
    await patientApi.completeExercise(assignmentId, { progress });
  } catch (error) {
    log.error('Error updating exercise progress:', error);
    throw error;
  }
}

// ============================================
// NOTIFICATIONS (Migrated to REST)
// ============================================

export async function getNotifications(_userId: string): Promise<Notification[]> {
  try {
    const data = await patientApi.getNotifications();
    return data.map((item: any) => ({
      ...item,
      createdAt: parseDate(item.createdAt),
    }));
  } catch (error) {
    log.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await patientApi.markNotificationRead(notificationId);
  } catch (error) {
    log.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsRead(_userId: string): Promise<void> {
  try {
    await patientApi.markAllNotificationsRead();
  } catch (error) {
    log.error('Error marking all notifications as read:', error);
    throw error;
  }
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  getNotifications(userId).then(callback);
  const interval = setInterval(() => {
    getNotifications(userId).then(callback);
  }, 60000);
  return () => clearInterval(interval);
}

// ============================================
// EVOLUTIONS / PROGRESS (Migrated to REST)
// ============================================

export async function getPatientEvolutions(
  _patientId: string,
  _limitCount: number = 10
): Promise<any[]> {
  try {
    // Reutilizar o endpoint de perfil ou evoluções específico
    const data = await api.request<any[]>('/api/patient/evolutions');
    return data.map((item: any) => ({
      ...item,
      createdAt: parseDate(item.createdAt),
    }));
  } catch (error) {
    log.error('Error fetching evolutions:', error);
    return [];
  }
}
