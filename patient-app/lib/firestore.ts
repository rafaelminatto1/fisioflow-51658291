  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================
// TYPES
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

function convertTimestamp(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

// ============================================
// PATIENT DATA
// ============================================

export async function getPatientProfile(userId: string): Promise<Patient | null> {
  try {
    // First try to get from patients collection by userId
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('userId', '==', userId), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || userId,
        name: data.name || data.displayName || 'Paciente',
        email: data.email || '',
        phone: data.phone,
        birthDate: data.birthDate,
        condition: data.condition || data.diagnosis,
        notes: data.notes,
        status: data.status || 'active',
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    }

    // Fallback to users collection
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: userDoc.id,
        userId: userDoc.id,
        name: data.name || data.displayName || 'Paciente',
        email: data.email || '',
        phone: data.phone,
        birthDate: data.birthDate,
        condition: data.condition,
        notes: data.notes,
        status: 'active',
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    return null;
  }
}

export async function updatePatientProfile(
  userId: string,
  data: Partial<Patient>
): Promise<void> {
  try {
    // First try to find patient by userId
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('userId', '==', userId), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docRef = doc(db, 'patients', snapshot.docs[0].id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new patient document
      const newDocRef = await addDoc(patientsRef, {
        ...data,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating patient profile:', error);
    throw error;
  }
}

// ============================================
// APPOINTMENTS
// ============================================

export async function getPatientAppointments(
  patientId: string,
  options?: { upcoming?: boolean; limit?: number }
): Promise<Appointment[]> {
  try {
    const appointmentsRef = collection(db, 'appointments');
    let q;

    if (options?.upcoming) {
      q = query(
        appointmentsRef,
        where('patientId', '==', patientId),
        where('date', '>=', new Date()),
        orderBy('date', 'asc'),
        limit(options.limit || 10)
      );
    } else {
      q = query(
        appointmentsRef,
        where('patientId', '==', patientId),
        orderBy('date', 'desc'),
        limit(options?.limit || 20)
      );
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        professionalId: data.professionalId || data.therapistId,
        professionalName: data.professionalName || data.therapistName,
        type: data.type || 'Fisioterapia',
        date: convertTimestamp(data.date),
        duration: data.duration || 45,
        status: data.status || 'scheduled',
        notes: data.notes,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

export function subscribeToAppointments(
  patientId: string,
  callback: (appointments: Appointment[]) => void
): () => void {
  const appointmentsRef = collection(db, 'appointments');
  const q = query(
    appointmentsRef,
    where('patientId', '==', patientId),
    orderBy('date', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const appointments = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        professionalId: data.professionalId || data.therapistId,
        professionalName: data.professionalName || data.therapistName,
        type: data.type || 'Fisioterapia',
        date: convertTimestamp(data.date),
        duration: data.duration || 45,
        status: data.status || 'scheduled',
        notes: data.notes,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };
    });
    callback(appointments);
  });
}

export async function confirmAppointment(appointmentId: string): Promise<void> {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    await updateDoc(docRef, {
      status: 'confirmed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error confirming appointment:', error);
    throw error;
  }
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw error;
  }
}

// ============================================
// EXERCISES
// ============================================

export async function getPatientExercises(patientId: string): Promise<ExerciseAssignment[]> {
  try {
    // Try patient_exercises collection first
    const exercisesRef = collection(db, 'patient_exercises');
    const q = query(
      exercisesRef,
      where('patientId', '==', patientId),
      where('active', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Fallback: check evolutions for exercise prescriptions
      const evolutionsRef = collection(db, 'evolutions');
      const evolutionsQ = query(
        evolutionsRef,
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const evolutionsSnapshot = await getDocs(evolutionsQ);
      const exercises: ExerciseAssignment[] = [];

      evolutionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.exercises && Array.isArray(data.exercises)) {
          data.exercises.forEach((ex: any, index: number) => {
            exercises.push({
              id: `${doc.id}-${index}`,
              patientId: patientId,
              exerciseId: ex.exerciseId || ex.id || `exercise-${index}`,
              exercise: {
                id: ex.exerciseId || ex.id || `exercise-${index}`,
                name: ex.name || 'Exercicio',
                description: ex.description || '',
                instructions: ex.instructions,
                sets: ex.sets || 3,
                reps: ex.reps || 10,
                duration: ex.duration,
                videoUrl: ex.videoUrl,
                imageUrl: ex.imageUrl,
                category: ex.category,
                difficulty: ex.difficulty,
                createdBy: data.therapistId,
              },
              sets: ex.sets || 3,
              reps: ex.reps || 10,
              frequency: ex.frequency || 'daily',
              startDate: convertTimestamp(data.createdAt),
              completed: ex.completed || false,
              completedAt: ex.completedAt ? convertTimestamp(ex.completedAt) : undefined,
              progress: ex.progress || 0,
            });
          });
        }
      });

      return exercises;
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        exerciseId: data.exerciseId,
        exercise: data.exercise,
        sets: data.sets || 3,
        reps: data.reps || 10,
        frequency: data.frequency || 'daily',
        startDate: convertTimestamp(data.startDate),
        endDate: data.endDate ? convertTimestamp(data.endDate) : undefined,
        completed: data.completed || false,
        completedAt: data.completedAt ? convertTimestamp(data.completedAt) : undefined,
        progress: data.progress || 0,
      };
    });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }
}

export async function markExerciseCompleted(
  assignmentId: string,
  completed: boolean
): Promise<void> {
  try {
    const docRef = doc(db, 'patient_exercises', assignmentId);
    await updateDoc(docRef, {
      completed,
      completedAt: completed ? serverTimestamp() : null,
      progress: completed ? 100 : 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating exercise:', error);
    throw error;
  }
}

export async function updateExerciseProgress(
  assignmentId: string,
  progress: number
): Promise<void> {
  try {
    const docRef = doc(db, 'patient_exercises', assignmentId);
    await updateDoc(docRef, {
      progress,
      completed: progress >= 100,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating exercise progress:', error);
    throw error;
  }
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('user_id', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id,
        title: data.title,
        body: data.body,
        type: data.type || 'system',
        read: data.read || false,
        data: data.data,
        createdAt: convertTimestamp(data.createdAt),
      };
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      read: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('user_id', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(batch);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('user_id', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.user_id,
        title: data.title,
        body: data.body,
        type: data.type || 'system',
        read: data.read || false,
        data: data.data,
        createdAt: convertTimestamp(data.createdAt),
      };
    });
    callback(notifications);
  });
}

// ============================================
// EVOLUTIONS / PROGRESS
// ============================================

export async function getPatientEvolutions(
  patientId: string,
  limitCount: number = 10
): Promise<any[]> {
  try {
    const evolutionsRef = collection(db, 'evolutions');
    const q = query(
      evolutionsRef,
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        patientId: data.patientId,
        therapistId: data.therapistId,
        therapistName: data.therapistName,
        notes: data.notes,
        painLevel: data.painLevel,
        exercises: data.exercises || [],
        createdAt: convertTimestamp(data.createdAt),
      };
    });
  } catch (error) {
    console.error('Error fetching evolutions:', error);
    return [];
  }
}
