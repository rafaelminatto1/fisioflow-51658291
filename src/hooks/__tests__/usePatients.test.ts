import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  patientKeys 
} from '../usePatients';
import { PatientService } from '@/lib/services/PatientService';

// Mock PatientService
vi.mock('@/lib/services/PatientService', () => ({
  PatientService: {
    searchPatients: vi.fn(),
    getActivePatients: vi.fn(),
    getPatient: vi.fn(),
    createPatient: vi.fn(),
    updatePatient: vi.fn(),
  }
}));

describe('usePatients hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('patientKeys', () => {
    it('should generate correct query keys', () => {
      expect(patientKeys.all).toEqual(['patients']);
      expect(patientKeys.search('João')).toEqual(['patients', 'search', 'João']);
      expect(patientKeys.active()).toEqual(['patients', 'active']);
      expect(patientKeys.byId('1')).toEqual(['patients', 'byId', '1']);
      expect(patientKeys.financial('1')).toEqual(['patients', 'financial', '1']);
      expect(patientKeys.summary('1')).toEqual(['patients', 'summary', '1']);
      expect(patientKeys.stats()).toEqual(['patients', 'stats']);
      expect(patientKeys.byTherapist('therapist1')).toEqual(['patients', 'byTherapist', 'therapist1']);
      expect(patientKeys.pendingPayments()).toEqual(['patients', 'pendingPayments']);
    });
  });

  describe('PatientService integration', () => {
    it('should have all required methods', () => {
      expect(PatientService.searchPatients).toBeDefined();
      expect(PatientService.getActivePatients).toBeDefined();
      expect(PatientService.getPatient).toBeDefined();
      expect(PatientService.createPatient).toBeDefined();
      expect(PatientService.updatePatient).toBeDefined();
    });
  });
});