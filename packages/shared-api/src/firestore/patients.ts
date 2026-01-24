import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '@fisioflow/shared-constants';

export class PatientFirestore {
  static async getPatient(patientId: string) {
    const docRef = doc(db, COLLECTIONS.PATIENTS, patientId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() };
  }

  static async listPatients(professionalId: string, options?: {
    activeOnly?: boolean;
    limit?: number;
  }) {
    let q = query(
      collection(db, COLLECTIONS.PATIENTS),
      where('professionalId', '==', professionalId),
      orderBy('createdAt', 'desc')
    );

    if (options?.activeOnly) {
      q = query(q, where('isActive', '==', true));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static onPatientChanged(
    patientId: string,
    callback: (patient: any) => void
  ) {
    const docRef = doc(db, COLLECTIONS.PATIENTS, patientId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      }
    });
  }

  static onPatientsChanged(
    professionalId: string,
    callback: (patients: any[]) => void
  ) {
    const q = query(
      collection(db, COLLECTIONS.PATIENTS),
      where('professionalId', '==', professionalId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const patients = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(patients);
    });
  }
}
