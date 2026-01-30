import { db } from '@/integrations/firebase/app';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import type { PatientGoal, PatientGoalFormData } from '@/types/evolution';
import { differenceInDays } from 'date-fns';

export class PatientGoalsService {
  static async getGoalsByPatientId(patientId: string): Promise<PatientGoal[]> {
    const q = query(
      collection(db, 'patient_goals'),
      where('patient_id', '==', patientId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        current_progress: data.current_progress || 0,
        priority: data.priority || 'media',
      } as PatientGoal;
    });
  }

  static async addGoal(data: PatientGoalFormData): Promise<PatientGoal> {
    const now = new Date().toISOString();
    const dataToSave = {
      ...data,
      current_progress: 0,
      priority: 'media',
      created_at: now,
      updated_at: now,
    };

    const docRef = await addDoc(collection(db, 'patient_goals'), dataToSave);
    const docSnap = await getDoc(docRef);

    const savedData = docSnap.data();
    return {
      ...savedData,
      id: docSnap.id,
      current_progress: 0,
      priority: 'media',
    } as PatientGoal;
  }

  static async updateGoalProgress(
    goalId: string,
    progress: number,
    currentValue?: string
  ): Promise<PatientGoal> {
    const docRef = doc(db, 'patient_goals', goalId);

    const updates: { current_progress: number; current_value?: string; updated_at: string } = {
      current_progress: progress,
      updated_at: new Date().toISOString(),
    };
    if (currentValue !== undefined) {
      updates.current_value = currentValue;
    }

    await updateDoc(docRef, updates);

    const docSnap = await getDoc(docRef);
    const data = docSnap.data();

    return {
      ...data,
      id: docSnap.id,
      current_progress: progress,
      priority: data.priority || 'media',
    } as PatientGoal;
  }

  static async updateGoal(goalId: string, data: Partial<PatientGoalFormData>): Promise<PatientGoal> {
    const docRef = doc(db, 'patient_goals', goalId);

    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    const docSnap = await getDoc(docRef);
    const updatedData = docSnap.data();

    return {
      ...updatedData,
      id: docSnap.id,
      current_progress: updatedData.current_progress || 0,
      priority: updatedData.priority || 'media',
    } as PatientGoal;
  }

  static async deleteGoal(goalId: string): Promise<void> {
    const docRef = doc(db, 'patient_goals', goalId);
    await deleteDoc(docRef);
  }

  static calculateCountdown(targetDate: string): { days: number; formatted: string } {
    const now = new Date();
    const target = new Date(targetDate);
    const days = differenceInDays(target, now);

    if (days < 0) {
      return { days: 0, formatted: 'Vencido' };
    } else if (days === 0) {
      return { days: 0, formatted: 'Hoje' };
    } else if (days === 1) {
      return { days: 1, formatted: 'Amanhã' };
    } else if (days <= 7) {
      return { days, formatted: `${days} dias` };
    } else if (days <= 30) {
      const weeks = Math.floor(days / 7);
      return { days, formatted: `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}` };
    } else {
      const months = Math.floor(days / 30);
      return { days, formatted: `${months} ${months === 1 ? 'mês' : 'meses'}` };
    }
  }

  static async markGoalCompleted(goalId: string): Promise<PatientGoal> {
    const docRef = doc(db, 'patient_goals', goalId);

    await updateDoc(docRef, {
      status: 'concluido',
      completed_at: new Date().toISOString(),
      current_progress: 100,
      updated_at: new Date().toISOString(),
    });

    const docSnap = await getDoc(docRef);
    const data = docSnap.data();

    return {
      ...data,
      id: docSnap.id,
      current_progress: 100,
      priority: data.priority || 'media',
    } as PatientGoal;
  }

  static getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critica': return 'destructive';
      case 'alta': return 'warning';
      case 'media': return 'default';
      case 'baixa': return 'secondary';
      default: return 'outline';
    }
  }
}
