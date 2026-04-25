import { doctorsApi } from "@/api/v2/doctors";
import type { Doctor, DoctorFormData } from "@/types/doctor";

export class DoctorService {
  static async getAllDoctors(): Promise<Doctor[]> {
    const response = await doctorsApi.list({ limit: 1000 });
    return (response.data || []) as unknown as Doctor[];
  }

  static async searchDoctors(searchTerm: string, maxResults: number = 10): Promise<Doctor[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const response = await doctorsApi.search({ searchTerm, limit: maxResults });
    return (response.data || []) as Doctor[];
  }

  static async getDoctorById(doctorId: string): Promise<Doctor | null> {
    try {
      const result = await doctorsApi.get(doctorId);
      return (result.data ?? null) as Doctor | null;
    } catch {
      return null;
    }
  }

  static async createDoctor(data: DoctorFormData): Promise<Doctor> {
    const result = await doctorsApi.create(data as unknown as Record<string, unknown>);
    return result.data as unknown as Doctor;
  }

  static async updateDoctor(doctorId: string, data: Partial<DoctorFormData>): Promise<Doctor> {
    const result = await doctorsApi.update(doctorId, data as unknown as Record<string, unknown>);
    return result.data as unknown as Doctor;
  }

  static async deleteDoctor(doctorId: string): Promise<void> {
    await doctorsApi.delete(doctorId);
  }

  static async permanentlyDeleteDoctor(doctorId: string): Promise<void> {
    await doctorsApi.delete(doctorId);
  }
}
