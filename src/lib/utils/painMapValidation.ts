import type { PainPoint } from '@/components/pain-map/BodyMap';
import { PainType } from '@/types/painMap';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Validar se um ponto de dor está completo e válido
export function validatePainPoint(point: Partial<PainPoint>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validações obrigatórias
  if (!point.regionCode || point.regionCode.trim() === '') {
    errors.push({
      field: 'regionCode',
      message: 'Região é obrigatória',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!point.region || point.region.trim() === '') {
    errors.push({
      field: 'region',
      message: 'Nome da região é obrigatório',
      code: 'REQUIRED_FIELD',
    });
  }

  if (point.intensity === undefined || point.intensity === null) {
    errors.push({
      field: 'intensity',
      message: 'Intensidade é obrigatória',
      code: 'REQUIRED_FIELD',
    });
  } else if (point.intensity < 0 || point.intensity > 10) {
    errors.push({
      field: 'intensity',
      message: 'Intensidade deve estar entre 0 e 10',
      code: 'INVALID_RANGE',
    });
  }

  if (!point.painType) {
    errors.push({
      field: 'painType',
      message: 'Tipo de dor é obrigatório',
      code: 'REQUIRED_FIELD',
    });
  } else if (!Object.values(PainType).includes(point.painType)) {
    errors.push({
      field: 'painType',
      message: 'Tipo de dor inválido',
      code: 'INVALID_VALUE',
    });
  }

  if (point.x === undefined || point.x === null || point.x < 0 || point.x > 100) {
    errors.push({
      field: 'x',
      message: 'Coordenada X deve estar entre 0 e 100',
      code: 'INVALID_RANGE',
    });
  }

  if (point.y === undefined || point.y === null || point.y < 0 || point.y > 100) {
    errors.push({
      field: 'y',
      message: 'Coordenada Y deve estar entre 0 e 100',
      code: 'INVALID_RANGE',
    });
  }

  // Validações condicionais
  if (point.muscleCode && !point.muscleName) {
    warnings.push({
      field: 'muscleName',
      message: 'Código de músculo fornecido sem nome',
      code: 'INCOMPLETE_DATA',
    });
  }

  if (point.muscleName && !point.muscleCode) {
    warnings.push({
      field: 'muscleCode',
      message: 'Nome de músculo fornecido sem código',
      code: 'INCOMPLETE_DATA',
    });
  }

  // Validações de aviso
  if (point.intensity !== undefined && point.intensity >= 8 && !point.notes) {
    warnings.push({
      field: 'notes',
      message: 'Recomendado adicionar observações para dor de alta intensidade',
      code: 'RECOMMENDED_FIELD',
    });
  }

  if (point.painType === 'cronica' && !point.date) {
    warnings.push({
      field: 'date',
      message: 'Recomendado registrar data para dor crônica',
      code: 'RECOMMENDED_FIELD',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Validar múltiplos pontos de dor
export function validatePainPoints(points: Partial<PainPoint>[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  points.forEach((point, _index) => {
    const result = validatePainPoint(point);
    result.errors.forEach(error => {
      allErrors.push({
        ...error,
        message: `Ponto: ${error.message}`,
      });
    });
    result.warnings.forEach(warning => {
      allWarnings.push({
        ...warning,
        message: `Ponto: ${warning.message}`,
      });
    });
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// Validar se não existem pontos duplicados
export function validateDuplicatePoints(points: PainPoint[]): ValidationResult {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();

  points.forEach((point) => {
    const key = `${point.regionCode}-${point.muscleCode || 'general'}`;
    if (seen.has(key)) {
      errors.push({
        field: 'points',
        message: `Ponto duplicado encontrado: ${point.region}${point.muscleName ? ` (${point.muscleName})` : ''}`,
        code: 'DUPLICATE_ENTRY',
      });
    }
    seen.add(key);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

// Sanitizar entrada de texto
export function sanitizeTextInput(input: string): string {
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .slice(0, 500); // Limitar tamanho
}

// Validar e sanitizar um ponto antes de salvar
export function sanitizeAndValidatePoint(point: Partial<PainPoint>): {
  sanitized: Partial<PainPoint>;
  validation: ValidationResult;
} {
  const sanitized: Partial<PainPoint> = {
    ...point,
    region: point.region ? sanitizeTextInput(point.region) : undefined,
    regionCode: point.regionCode,
    muscleName: point.muscleName ? sanitizeTextInput(point.muscleName) : undefined,
    muscleCode: point.muscleCode,
    notes: point.notes ? sanitizeTextInput(point.notes) : undefined,
    intensity: point.intensity,
    painType: point.painType,
    x: point.x,
    y: point.y,
    date: point.date,
  };

  const validation = validatePainPoint(sanitized);

  return { sanitized, validation };
}

// Validar dados de exportação
export function validateExportData(data: {
  patientName?: string;
  frontPoints?: PainPoint[];
  backPoints?: PainPoint[];
}): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data.patientName || data.patientName.trim() === '') {
    warnings.push({
      field: 'patientName',
      message: 'Nome do paciente não fornecido',
      code: 'RECOMMENDED_FIELD',
    });
  }

  const allPoints = [...(data.frontPoints || []), ...(data.backPoints || [])];

  if (allPoints.length === 0) {
    warnings.push({
      field: 'points',
      message: 'Nenhum ponto de dor para exportar',
      code: 'NO_DATA',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Helper para formatar mensagens de erro
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Erros de validação:');
    result.errors.forEach(error => {
      lines.push(`  • ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('Avisos:');
    result.warnings.forEach(warning => {
      lines.push(`  • ${warning.message}`);
    });
  }

  return lines.join('\n');
}

// Tipos de erro para tratamento específico
export enum ValidationErrorCode {
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_RANGE = 'INVALID_RANGE',
  INVALID_VALUE = 'INVALID_VALUE',
  INCOMPLETE_DATA = 'INCOMPLETE_DATA',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  RECOMMENDED_FIELD = 'RECOMMENDED_FIELD',
  NO_DATA = 'NO_DATA',
}

// Verificar se um erro é de um tipo específico
export function hasErrorCode(result: ValidationResult, code: ValidationErrorCode): boolean {
  return [...result.errors, ...result.warnings].some(error => error.code === code);
}

// Filtrar erros por código
export function filterErrorsByCode(result: ValidationResult, code: ValidationErrorCode): ValidationError[] {
  return result.errors.filter(error => error.code === code);
}
