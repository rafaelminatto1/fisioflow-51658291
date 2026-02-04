import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from '@/integrations/firebase/app';
import type { Surgery, SurgeryFormData } from '@/types/evolution';
import { differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';

export class SurgeryService {
  // Optimized: Select only required columns instead of *
  static async getSurgeriesByPatientId(patientId: string): Promise<Surgery[]> {
    const q = query(
      collection(db, 'patient_surgeries'),
      where('patient_id', '==', patientId),
      orderBy('surgery_date', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        patient_id: data.patient_id,
        surgery_type: data.surgery_type,
        surgery_date: data.surgery_date,
        hospital: data.hospital,
        surgeon: data.surgeon,
        notes: data.notes,
        complications: data.complications,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as Surgery;
    });
  }

  // Optimized: Select only required columns
  static async addSurgery(data: SurgeryFormData): Promise<Surgery> {
    const now = new Date().toISOString();
    const dataToSave = {
      ...data,
      created_at: now,
      updated_at: now,
    };

    const docRef = await addDoc(collection(db, 'patient_surgeries'), dataToSave);
    const docSnap = await getDoc(docRef);

    const savedData = docSnap.data();
    return {
      id: docSnap.id,
      patient_id: savedData.patient_id,
      surgery_type: savedData.surgery_type,
      surgery_date: savedData.surgery_date,
      hospital: savedData.hospital,
      surgeon: savedData.surgeon,
      notes: savedData.notes,
      complications: savedData.complications,
      created_at: savedData.created_at,
      updated_at: savedData.updated_at,
    } as Surgery;
  }

  // Optimized: Select only required columns
  static async updateSurgery(surgeryId: string, data: Partial<SurgeryFormData>): Promise<Surgery> {
    const docRef = doc(db, 'patient_surgeries', surgeryId);

    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    const docSnap = await getDoc(docRef);
    const updatedData = docSnap.data();

    return {
      id: docSnap.id,
      patient_id: updatedData.patient_id,
      surgery_type: updatedData.surgery_type,
      surgery_date: updatedData.surgery_date,
      hospital: updatedData.hospital,
      surgeon: updatedData.surgeon,
      notes: updatedData.notes,
      complications: updatedData.complications,
      created_at: updatedData.created_at,
      updated_at: updatedData.updated_at,
    } as Surgery;
  }

  static async deleteSurgery(surgeryId: string): Promise<void> {
    const docRef = doc(db, 'patient_surgeries', surgeryId);
    await deleteDoc(docRef);
  }

  static calculateTimeSinceSurgery(surgeryDate: string): string {
    const now = new Date();
    const surgery = new Date(surgeryDate);

    const days = differenceInDays(now, surgery);
    const months = differenceInMonths(now, surgery);
    const years = differenceInYears(now, surgery);

    if (years > 0) {
      return years === 1 ? 'há 1 ano' : `há ${years} anos`;
    } else if (months > 0) {
      return months === 1 ? 'há 1 mês' : `há ${months} meses`;
    } else if (days > 0) {
      return days === 1 ? 'há 1 dia' : `há ${days} dias`;
    } else {
      return 'hoje';
    }
  }

  static getRecoveryPhase(surgeryDate: string): { phase: string; color: string } {
    const days = differenceInDays(new Date(), new Date(surgeryDate));

    if (days <= 30) {
      return { phase: 'Fase Aguda', color: 'destructive' };
    } else if (days <= 90) {
      return { phase: 'Fase Subaguda', color: 'warning' };
    } else if (days <= 180) {
      return { phase: 'Recuperação', color: 'default' };
    } else {
      return { phase: 'Consolidada', color: 'success' };
    }
  }
}
