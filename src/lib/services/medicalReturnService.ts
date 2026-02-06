import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from '@/integrations/firebase/app';
import type { MedicalReturn, MedicalReturnFormData } from '@/types/evolution';

export class MedicalReturnService {
    static async getMedicalReturnsByPatientId(patientId: string): Promise<MedicalReturn[]> {
        const q = query(
            collection(db, 'patient_medical_returns'),
            where('patient_id', '==', patientId),
            orderBy('return_date', 'desc')
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                patient_id: data.patient_id,
                doctor_name: data.doctor_name,
                doctor_phone: data.doctor_phone,
                return_date: data.return_date,
                return_period: data.return_period,
                notes: data.notes,
                report_done: data.report_done,
                report_sent: data.report_sent,
                created_at: data.created_at,
                updated_at: data.updated_at,
            } as MedicalReturn;
        });
    }

    static async addMedicalReturn(data: MedicalReturnFormData): Promise<MedicalReturn> {
        const now = new Date().toISOString();
        const dataToSave = {
            ...data,
            created_at: now,
            updated_at: now,
        };

        const docRef = await addDoc(collection(db, 'patient_medical_returns'), dataToSave);
        const docSnap = await getDoc(docRef);

        const savedData = docSnap.data()!;
        return {
            id: docSnap.id,
            patient_id: savedData.patient_id,
            doctor_name: savedData.doctor_name,
            doctor_phone: savedData.doctor_phone,
            return_date: savedData.return_date,
            return_period: savedData.return_period,
            notes: savedData.notes,
            report_done: savedData.report_done,
            report_sent: savedData.report_sent,
            created_at: savedData.created_at,
            updated_at: savedData.updated_at,
        } as MedicalReturn;
    }

    static async updateMedicalReturn(returnId: string, data: Partial<MedicalReturnFormData>): Promise<MedicalReturn> {
        const docRef = doc(db, 'patient_medical_returns', returnId);

        await updateDoc(docRef, {
            ...data,
            updated_at: new Date().toISOString(),
        });

        const docSnap = await getDoc(docRef);
        const updatedData = docSnap.data()!;

        return {
            id: docSnap.id,
            patient_id: updatedData.patient_id,
            doctor_name: updatedData.doctor_name,
            doctor_phone: updatedData.doctor_phone,
            return_date: updatedData.return_date,
            return_period: updatedData.return_period,
            notes: updatedData.notes,
            report_done: updatedData.report_done,
            report_sent: updatedData.report_sent,
            created_at: updatedData.created_at,
            updated_at: updatedData.updated_at,
        } as MedicalReturn;
    }

    static async deleteMedicalReturn(returnId: string): Promise<void> {
        const docRef = doc(db, 'patient_medical_returns', returnId);
        await deleteDoc(docRef);
    }
}
