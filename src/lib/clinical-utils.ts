import { Exercise, Patient } from "@/types";

/**
 * Checks for clinical contraindications between an exercise and a patient's pathologies.
 * Returns an array of conflicting pathologies found.
 */
export function findContraindications(exercise: Exercise, patient: Patient): string[] {
	if (!exercise || !patient) return [];

	const contraindications = exercise.contraindicated_pathologies || [];
	if (contraindications.length === 0) return [];

	// Patient pathologies can come from multiple places:
	// 1. mainCondition (string)
	// 2. medicalHistory (text area, needs parsing or manual check) - skipping for now for exact match
	// 3. indicated_pathologies (array, if the patient record has them)
	
	const patientPathologies: string[] = [];
	
	if (patient.mainCondition) {
		patientPathologies.push(patient.mainCondition);
	}
	
	// Add other pathologies if they exist in the patient object
	// (Assuming there's a field for standardized pathologies in the patient record)
	if ((patient as any).pathologies && Array.isArray((patient as any).pathologies)) {
		patientPathologies.push(...(patient as any).pathologies);
	}

	// Find conflicts (case insensitive match)
	const conflicts = contraindications.filter(contra => 
		patientPathologies.some(p => p.toLowerCase().trim() === contra.toLowerCase().trim())
	);

	return conflicts;
}

/**
 * Gets the precaution color based on the precaution level.
 */
export function getPrecautionColor(level?: string): string {
	switch (level) {
		case "safe": return "text-emerald-500 bg-emerald-50";
		case "supervised": return "text-amber-500 bg-amber-50";
		case "restricted": return "text-rose-500 bg-rose-50";
		default: return "text-muted-foreground bg-muted";
	}
}
