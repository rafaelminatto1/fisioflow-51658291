/**
 * Fase 2 - Documentos
 * Exporta todos os geradores e utilitários de documentos
 */

// PDF Generators
export {
  AtestadoGenerator,
  DeclaracaoComparecimentoGenerator,
  ReceituarioGenerator,
  EvolucaoGenerator,
  PlanoTratamentoGenerator,
  PDFGeneratorFactory,
} from './pdf-generator';

export type {
  PatientData,
  ProfessionalData,
  ClinicData,
} from './pdf-generator';

// Financial Reports
export {
  FinancialReportGenerator,
  generateFinancialReportPDF,
  saveFinancialReportPDF,
} from './financial-reports';

export type { FinancialReportData } from './financial-reports';

// Receipt Generator
export {
  ReceiptGenerator,
  generateReceiptPDF,
  saveReceiptPDF,
} from './receipt-generator';

export type { ReceiptData } from './receipt-generator';

// Excel Integration
export {
  exportPatientsToExcel,
  exportFinancialReport,
  exportAttendanceStats,
  importPatientsFromExcel,
  generatePatientImportTemplate,
  downloadExcelFile,
} from './xlsx-integration';

// DOCX Templates
export {
  AtestadoDocxGenerator,
  ReceituarioDocxGenerator,
  EvolucaoDocxGenerator,
  AnamneseDocxGenerator,
} from './docx-templates';
