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
export { usePatients } from '../usePatients';

// Hook V2 de pacientes (versão otimizada)
export { usePatientsV2 } from '../usePatientsV2';

// Hook de CRUD de paciente
export { usePatientCrud } from '../usePatientCrud';

// Hook de perfil de paciente otimizado
export { usePatientProfileOptimized, usePatientProfilePrefetch } from '../usePatientProfileOptimized';

// ============================================================================
// Patient Data Hooks
// ============================================================================

// Hook de documentos do paciente
export { 
  usePatientDocuments, 
  useUploadDocument, 
  useDeleteDocument, 
  useDownloadDocument 
} from '../usePatientDocuments';

// Hook de exames do paciente
export { usePatientExams } from '../usePatientExams';

// Hook de evolução do paciente
export { usePatientEvolution } from '../usePatientEvolution';

// Hook de objetivos do paciente
export { usePatientObjectives } from '../usePatientObjectives';

// Hook de estatísticas do paciente
export { usePatientStats } from '../usePatientStats';

// ============================================================================
// Patient Analytics Hooks
// ============================================================================

// Hook de analytics do paciente
export { usePatientAnalytics } from '../usePatientAnalytics';

// Hook de retenção de pacientes
export { usePatientRetention } from '../usePatientRetention';

// Hook de insights do paciente
export { usePatientInsight } from '../usePatientInsight';

// Hook de sumário AI do paciente
export { usePatientAISummary } from '../usePatientAISummary';

// ============================================================================
// Patient Evolution Report
// ============================================================================

export { usePatientEvolutionReport } from '../usePatientEvolutionReport';

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
  usePainStatistics
} from '../usePainMaps';

export { usePainMapHistory } from '../usePainMapHistory';
export { usePainMapShortcuts } from '../usePainMapShortcuts';

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
} from '../useSoapRecords';

// ============================================================================
// Medical Records Hooks
// ============================================================================

export {
  useMedicalRecords,
  useCreateMedicalRecord,
  useUpdateMedicalRecord,
  useDeleteMedicalRecord,
} from '../useMedicalRecords';

export { useMedicalRecord } from '../useMedicalRecord';

// ============================================================================
// Incomplete Patients
// ============================================================================

export { useIncompletePatients } from '../useIncompletePatients';

// ============================================================================
// Types
// ============================================================================

export type { Patient, PatientDocument, PatientConsent, PatientFormData } from '@/types';