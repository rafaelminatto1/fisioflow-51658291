import { DataExposureLevel } from "./aiTasks";

export interface ClinicalContext {
  age?: number;
  dob?: string;
  gender?: string;
  address?: string;
  patientName?: string;
  familyNames?: string[];
  privateLinks?: string[];
  clinicalNotes?: string;
}

export function minimizeClinicalData(context: ClinicalContext, level: DataExposureLevel) {
  if (level === "none") {
    return null;
  }

  if (level === "minimal") {
    return {
      age: context.age,
      gender: context.gender,
    };
  }

  if (level === "clinical_context") {
    return {
      age: context.age,
      gender: context.gender,
      clinicalNotes: context.clinicalNotes, // This will be sanitized separately inside sanitizePrompt
    };
  }

  if (level === "full_internal_only") {
    // Return all data but this level is strictly validated in Router
    return context;
  }

  return null;
}
