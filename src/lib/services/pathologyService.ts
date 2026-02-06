import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from '@/integrations/firebase/app';
import type { Pathology } from '@/types/evolution';

export class PathologyService {
  // Optimized: Select only required columns instead of *
  static async getPathologiesByPatientId(patientId: string): Promise<Pathology[]> {
    const q = query(
      collection(db, 'patient_pathologies'),
      where('patient_id', '==', patientId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        patient_id: data.patient_id,
        diagnosis: data.diagnosis,
        status: data.status,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as Pathology;
    });
  }

  // Optimized: Select only required columns instead of *
  static async getActivePathologies(patientId: string): Promise<Pathology[]> {
    const q = query(
      collection(db, 'patient_pathologies'),
      where('patient_id', '==', patientId),
      where('status', '==', 'em_tratamento'),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        patient_id: data.patient_id,
        diagnosis: data.diagnosis,
        status: data.status,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as Pathology;
    });
  }

  // Optimized: Select only required columns instead of *
  static async getResolvedPathologies(patientId: string): Promise<Pathology[]> {
    const q = query(
      collection(db, 'patient_pathologies'),
      where('patient_id', '==', patientId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);

    // Client-side filter for resolved pathologies (Firestore doesn't support 'in' with arrays well)
    return snapshot.docs
      .map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          patient_id: data.patient_id,
          diagnosis: data.diagnosis,
          status: data.status,
          notes: data.notes,
          created_at: data.created_at,
          updated_at: data.updated_at,
        } as Pathology;
      })
      .filter(p => p.status === 'tratada' || p.status === 'cronica');
  }

  // Optimized: Select only required columns
  static async addPathology(data: PathologyFormData): Promise<Pathology> {
    const now = new Date().toISOString();
    const dataToSave = {
      ...data,
      created_at: now,
      updated_at: now,
    };

    const docRef = await addDoc(collection(db, 'patient_pathologies'), dataToSave);
    const docSnap = await getDoc(docRef);

    const savedData = docSnap.data();
    return {
      id: docSnap.id,
      patient_id: savedData.patient_id,
      diagnosis: savedData.diagnosis,
      status: savedData.status,
      notes: savedData.notes,
      created_at: savedData.created_at,
      updated_at: savedData.updated_at,
    } as Pathology;
  }

  // Optimized: Select only required columns
  static async updatePathology(pathologyId: string, data: Partial<PathologyFormData>): Promise<Pathology> {
    const docRef = doc(db, 'patient_pathologies', pathologyId);

    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    const docSnap = await getDoc(docRef);
    const updatedData = docSnap.data();

    return {
      id: docSnap.id,
      patient_id: updatedData.patient_id,
      diagnosis: updatedData.diagnosis,
      status: updatedData.status,
      notes: updatedData.notes,
      created_at: updatedData.created_at,
      updated_at: updatedData.updated_at,
    } as Pathology;
  }

  // Optimized: Select only required columns
  static async markAsResolved(pathologyId: string): Promise<Pathology> {
    return this.updatePathology(pathologyId, { status: 'tratada' });
  }

  // Optimized: Select only required columns
  static async markAsActive(pathologyId: string): Promise<Pathology> {
    return this.updatePathology(pathologyId, { status: 'em_tratamento' });
  }

  static async deletePathology(pathologyId: string): Promise<void> {
    const docRef = doc(db, 'patient_pathologies', pathologyId);
    await deleteDoc(docRef);
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'em_tratamento': return 'warning';
      case 'tratada': return 'success';
      case 'cronica': return 'secondary';
      default: return 'outline';
    }
  }

  static getStatusLabel(status: string): string {
    switch (status) {
      case 'em_tratamento': return 'Em Tratamento';
      case 'tratada': return 'Tratada';
      case 'cronica': return 'Crônica';
      default: return status;
    }
  }
}
