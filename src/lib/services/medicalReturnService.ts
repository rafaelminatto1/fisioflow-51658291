import { patientsApi } from "@/api/v2";
import type { MedicalReturn, MedicalReturnFormData } from "@/types/evolution";

export class MedicalReturnService {
  static async getMedicalReturnsByPatientId(patientId: string): Promise<MedicalReturn[]> {
    const res = await patientsApi.medicalReturns(patientId);
    return (res.data ?? []) as MedicalReturn[];
  }

  static async addMedicalReturn(data: MedicalReturnFormData): Promise<MedicalReturn> {
    const res = await patientsApi.createMedicalReturn(data.patient_id, data);
    return res.data;
  }

  static async updateMedicalReturn(
    returnId: string,
    data: Partial<MedicalReturnFormData>,
  ): Promise<MedicalReturn> {
    const patientId = String(data.patient_id ?? "").trim();
    if (!patientId) throw new Error("patient_id é obrigatório para atualizar retorno médico");

    const res = await patientsApi.updateMedicalReturn(patientId, returnId, data);
    return res.data;
  }

  static async deleteMedicalReturn(returnId: string, patientId: string): Promise<void> {
    await patientsApi.deleteMedicalReturn(patientId, returnId);
  }
}
