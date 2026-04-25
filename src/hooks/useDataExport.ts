/**
 * useDataExport - Migrated to Neon/Workers API
 *
 * Fetches all patient-related data via the Workers clients, then serializes a
 * JSON snapshot for download.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  appointmentsApi,
  clinicalApi,
  documentsApi,
  medicalRequestsApi,
  patientsApi,
} from "@/api/v2";

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPatientData = async (patientId: string) => {
    setIsExporting(true);
    try {
      const [patientRes, appointmentsRes, medicalRecordsRes, documentsRes, exercisesRes] =
        await Promise.all([
          patientsApi.get(patientId),
          appointmentsApi.list({ patientId, limit: 1000 }),
          medicalRequestsApi.list(patientId),
          documentsApi.list(patientId),
          clinicalApi.prescribedExercises.list({ patientId }),
        ]);

      const patient = patientRes?.data ?? null;
      if (!patient) throw new Error("Paciente não encontrado");

      const fullData = {
        exportedAt: new Date().toISOString(),
        patient,
        appointments: appointmentsRes?.data ?? [],
        medicalRecords: medicalRecordsRes?.data ?? [],
        documents: documentsRes?.data ?? [],
        prescribedExercises: exercisesRes?.data ?? [],
      };

      const blob = new Blob([JSON.stringify(fullData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const patientNameSlug = (patient.full_name ?? patient.name ?? "patient")
        .replace(/\s+/g, "_")
        .replace(/[^\w-]/g, "")
        .toLowerCase();
      a.download = `patient_export_${patientNameSlug}_${new Date().toISOString().split("T")[0]}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Exportação concluída — o download do JSON deve começar em instantes.");
    } catch (error) {
      console.error("Export erro", error);
      toast.error("Erro na exportação: não foi possível gerar o arquivo de dados.");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportPatientData, isExporting };
}
