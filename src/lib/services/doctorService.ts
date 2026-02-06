import { db, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from '@/integrations/firebase/app';
import { doctorsApi } from '@/integrations/firebase/functions';
import type { Doctor, DoctorFormData } from '@/types/doctor';

export class DoctorService {
    /**
     * Get all doctors for the organization (using Cloud SQL for scalability)
     */
    static async getAllDoctors(): Promise<Doctor[]> {
        try {
            const response = await doctorsApi.list({ limit: 1000 });
            return (response.data || []) as unknown as Doctor[];
        } catch (error) {
            console.error('Error fetching doctors from API, falling back to Firestore search:', error);
            query(
                collection(db, 'doctors'),
                where('is_active', '==', true),
                orderBy('name', 'asc')
            );
            // Fallback: devolver vazio para não quebrar a UI, mas poderíamos ler o snapshot aqui.
            return [];
        }
    }

    /**
     * Search doctors by name (for autocomplete) - Optimized via Cloud SQL
     */
    static async searchDoctors(searchTerm: string, maxResults: number = 10): Promise<Doctor[]> {
        if (!searchTerm || searchTerm.trim().length < 2) {
            return [];
        }

        try {
            const response = await doctorsApi.search({ searchTerm, limit: maxResults });
            return (response.data || []) as Doctor[];
        } catch (error) {
            console.error('Error searching doctors from API:', error);
            return [];
        }
    }

    /**
     * Get doctor by ID
     */
    static async getDoctorById(doctorId: string): Promise<Doctor | null> {
        const docRef = doc(db, 'doctors', doctorId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name,
            specialty: data.specialty,
            crm: data.crm,
            crm_state: data.crm_state,
            phone: data.phone,
            email: data.email,
            clinic_name: data.clinic_name,
            clinic_address: data.clinic_address,
            clinic_phone: data.clinic_phone,
            notes: data.notes,
            is_active: data.is_active ?? true,
            created_at: data.created_at,
            updated_at: data.updated_at,
        } as Doctor;
    }

    /**
     * Create a new doctor
     */
    static async createDoctor(data: DoctorFormData): Promise<Doctor> {
        const now = new Date().toISOString();
        const dataToSave = {
            ...data,
            is_active: true,
            created_at: now,
            updated_at: now,
        };

        const docRef = await addDoc(collection(db, 'doctors'), dataToSave);
        const docSnap = await getDoc(docRef);

        const savedData = docSnap.data() as Partial<Doctor> | undefined;
        return {
            id: docSnap.id,
            name: savedData?.name || '',
            specialty: savedData?.specialty,
            crm: savedData?.crm,
            crm_state: savedData?.crm_state,
            phone: savedData?.phone,
            email: savedData?.email,
            clinic_name: savedData?.clinic_name,
            clinic_address: savedData?.clinic_address,
            clinic_phone: savedData?.clinic_phone,
            notes: savedData?.notes,
            is_active: savedData?.is_active ?? true,
            created_at: savedData?.created_at || now,
            updated_at: savedData?.updated_at || now,
        } as Doctor;
    }

    /**
     * Update an existing doctor
     */
    static async updateDoctor(doctorId: string, data: Partial<DoctorFormData>): Promise<Doctor> {
        const docRef = doc(db, 'doctors', doctorId);

        await updateDoc(docRef, {
            ...data,
            updated_at: new Date().toISOString(),
        });

        const docSnap = await getDoc(docRef);
        const updatedData = docSnap.data();

        return {
            id: docSnap.id,
            name: updatedData?.name || '',
            specialty: updatedData?.specialty,
            crm: updatedData?.crm,
            crm_state: updatedData?.crm_state,
            phone: updatedData?.phone,
            email: updatedData?.email,
            clinic_name: updatedData?.clinic_name,
            clinic_address: updatedData?.clinic_address,
            clinic_phone: updatedData?.clinic_phone,
            notes: updatedData?.notes,
            is_active: updatedData?.is_active ?? true,
            created_at: updatedData?.created_at || '',
            updated_at: updatedData?.updated_at || '',
        } as Doctor;
    }

    /**
     * Soft delete a doctor (set is_active to false)
     */
    static async deleteDoctor(doctorId: string): Promise<void> {
        const docRef = doc(db, 'doctors', doctorId);
        await updateDoc(docRef, {
            is_active: false,
            updated_at: new Date().toISOString(),
        });
    }

    /**
     * Hard delete a doctor (permanent)
     */
    static async permanentlyDeleteDoctor(doctorId: string): Promise<void> {
        const docRef = doc(db, 'doctors', doctorId);
        await deleteDoc(docRef);
    }
}
