// SOAP Components - Healthcare Documentation System
// Professional electronic medical records with clinical compliance

export { PainScale } from './PainScale';
export { RangeOfMotion } from './RangeOfMotion';
export { FunctionalAssessment } from './FunctionalAssessment';
export { SOAPWizard } from './SOAPWizard';
export { DigitalSignature } from './DigitalSignature';
export { PhotoDocumentation } from './PhotoDocumentation';
export { AuditTrail } from './AuditTrail';

// Re-export types from the hook for convenience
export type {
  ExtendedSOAPRecord,
  SubjectiveData,
  ObjectiveData,
  AssessmentData,
  PlanData,
  FunctionalTest
} from '../../hooks/useSOAPRecords';