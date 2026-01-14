// Core Components
export { BodyMap } from './BodyMap';
export type { PainPoint } from './BodyMap';
export { BodyMapAnatomical } from './BodyMapAnatomical';
export { BodyMapRealistic } from './BodyMapRealistic';

// Editor Components
export { PainMapEditor } from './PainMapEditor';
export { MuscleSelectorModal } from './MuscleSelectorModal';
export { PainPointModal } from './PainPointModal';
export { PainPointDetailPanel } from './PainPointDetailPanel';
export { PainPointsManager } from './PainPointsManager';
export { PainPointsBottomSheet } from './PainPointsBottomSheet';
export { PainDetailsForm } from './PainDetailsForm';
export { PainGauge } from './PainGauge';
export { EvaScaleBar } from './EvaScaleBar';
export { PainMapComparison } from './PainMapComparison';
export { PainEvolutionChart } from './PainEvolutionChart';

// Toolbar & Export
export { PainMapToolbar } from './PainMapToolbar';
export { ShortcutHelp, usePainMapShortcuts } from '@/hooks/usePainMapShortcuts';

// Utils
export {
  exportPainMap,
  printPainMap,
  copyToClipboard,
  generateTextReport,
  generateCSV,
  generateJSON,
  calculatePainMapStatistics,
  type PainMapExportData,
} from '@/lib/utils/painMapExport';

export {
  validatePainPoint,
  validatePainPoints,
  validateDuplicatePoints,
  sanitizeAndValidatePoint,
  validateExportData,
  sanitizeTextInput,
  formatValidationErrors,
  hasErrorCode,
  filterErrorsByCode,
  type ValidationError,
  type ValidationResult,
  ValidationErrorCode,
} from '@/lib/utils/painMapValidation';

// Data
export {
  getMusclesByRegion,
  getMuscleGroup,
  getAllMuscleGroups,
  FRONT_MUSCLE_GROUPS,
  BACK_MUSCLE_GROUPS,
  type Muscle,
  type MuscleGroup,
} from '@/lib/data/bodyMuscles';

