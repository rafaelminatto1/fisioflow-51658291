/**
 * FisioFlow - Patients Hooks
 *
 * Este módulo centraliza todos os hooks relacionados a pacientes.
 * Os arquivos originais permanecem em src/hooks/ para compatibilidade.
 *
 * @module hooks/patients
 */

// ============================================================================
// Core Patient Hooks
// ============================================================================

// Hook principal de pacientes
/**
 * FisioFlow - Hooks de Pacientes
 * @module hooks/patients
 *
 * Este módulo centraliza todos os hooks relacionados a pacientes.
 *
 * Hooks Principais:
 * - usePatients: Hook principal para listar pacientes ativos
 * - usePatientsV2: Versão otimizada com nova API
 * - usePatientCrud: Operações CRUD de pacientes
 * - useActivePatients: Lista apenas pacientes ativos
 * - usePatientRetention: Análise de retenção
 *
 * @example
 * // Importação recomendada
 * import { usePatients, usePatientCrud } from '@/hooks/patients';
 */

// Hook principal de pacientes
export { usePatients, useActivePatients, usePatientById, useCreatePatient, useUpdatePatient, useDeletePatient } from "./usePatients";

// Hook de CRUD de paciente
export * from "./usePatientCrud";

// Hook de perfil de paciente otimizado
export {
	usePatientProfileOptimized,
	usePatientProfilePrefetch,
} from "../usePatientProfileOptimized";

// ============================================================================
// Patient Data Hooks
// ============================================================================

// Hook de documentos do paciente
export {
	usePatientDocuments,
	useUploadDocument,
	useDeleteDocument,
	useDownloadDocument,
} from "../usePatientDocuments";

// Hook de exames do paciente
export { usePatientExams } from "../usePatientExams";

// Hook de evolução do paciente — importar diretamente de @/hooks/usePatientEvolution

// Hook de objetivos do paciente
export { usePatientObjectives } from "../usePatientObjectives";

// Hook de estatísticas do paciente
export { usePatientStats } from "../usePatientStats";

// ============================================================================
// Patient Analytics Hooks
// ============================================================================

// Hook de analytics do paciente — importar diretamente de @/hooks/usePatientAnalytics

// Hook de retenção de pacientes — importar diretamente de @/hooks/usePatientRetention

// Hook de insights do paciente
export { usePatientInsight } from "../usePatientInsight";

// Hook de sumário AI do paciente
export { usePatientAISummary } from "../usePatientAISummary";

// ============================================================================
// Patient Evolution Report
// ============================================================================

export { usePatientEvolutionReport } from "../usePatientEvolutionReport";

// ============================================================================
// Pain Map Hooks
// ============================================================================

export {
	usePainMaps,
	usePainMapsBySession,
	usePainMapsByPatient,
	usePainMap,
	useCreatePainMap,
	useDeletePainMap,
	useUpdatePainMap,
	useComparePainMaps,
	usePainEvolution,
	usePainStatistics,
} from "../usePainMaps";

export { usePainMapHistory } from "../usePainMapHistory";
export { usePainMapShortcuts } from "../usePainMapShortcuts";

// ============================================================================
// SOAP Records Hooks
// ============================================================================

export {
	useSoapRecords,
	useInfiniteSoapRecords,
	useSoapRecord,
	useCreateSoapRecord,
	useUpdateSoapRecord,
	useSignSoapRecord,
	useDeleteSoapRecord,
	useDraftSoapRecords,
	useDraftSoapRecordByAppointment,
	useAutoSaveSoapRecord,
	useSessionAttachments,
	useUploadSessionAttachment,
	useDeleteSessionAttachment,
	useSessionTemplates,
	useCreateSessionTemplate,
	useUpdateSessionTemplate,
	useDeleteSessionTemplate,
} from "../useSoapRecords";

// ============================================================================
// Medical Records Hooks
// ============================================================================

export {
	useMedicalRecords,
	useCreateMedicalRecord,
	useUpdateMedicalRecord,
	useDeleteMedicalRecord,
} from "../useMedicalRecords";

// useMedicalRecord — importar diretamente de @/hooks/useMedicalRecord

// ============================================================================
// Incomplete Patients
// ============================================================================

export { useIncompletePatients } from "../useIncompletePatients";

// ============================================================================
// Types
// ============================================================================

export type {
	Patient,
	PatientDocument,
	PatientConsent,
	PatientFormData,
} from "@/types";
