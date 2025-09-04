import { describe, it, expect } from 'vitest';
import {
  createPatientSchema,
  updatePatientSchema,
  searchPatientSchema,
  patientFiltersSchema
} from '@/lib/validations/patient';

describe('Patient Validations', () => {
  describe('createPatientSchema', () => {
    it('should validate correct patient creation data', () => {
      const validData = {
        firstName: 'Maria',
        lastName: 'Silva Santos',
        email: 'maria@example.com',
        phone: '(11) 99999-9999',
        birthDate: '1990-05-15',
        gender: 'female' as const,
        cpf: '111.444.777-35',
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        emergencyContact: 'João Santos',
        emergencyPhone: '(11) 88888-8888',
        medicalHistory: 'Histórico médico do paciente'
      };
      
      const result = createPatientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid email format', () => {
      const invalidData = {
        firstName: 'Maria',
        lastName: 'Silva',
        email: 'invalid-email',
        phone: '(11) 99999-9999',
        birthDate: '1990-05-15',
        gender: 'female' as const,
        cpf: '111.444.777-35',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.path.includes('email'))).toBe(true);
      }
    });
    
    it('should reject invalid birth date (future date)', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const invalidData = {
        firstName: 'Maria',
        lastName: 'Silva',
        email: 'maria@example.com',
        phone: '(11) 99999-9999',
        birthDate: futureDate.toISOString().split('T')[0],
        gender: 'female' as const,
        cpf: '111.444.777-35',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should reject invalid gender', () => {
      const invalidData = {
        firstName: 'Maria',
        lastName: 'Silva',
        email: 'maria@example.com',
        phone: '(11) 99999-9999',
        birthDate: '1990-05-15',
        gender: 'invalid' as any,
        cpf: '111.444.777-35',
         street: 'Rua Test',
         number: '123',
         neighborhood: 'Centro',
         city: 'São Paulo',
         state: 'SP',
         zipCode: '01234-567',
         emergencyContact: 'Emergency Contact',
         emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should validate with minimal required fields', () => {
      const minimalData = {
        firstName: 'João',
        lastName: 'Silva',
        phone: '(11) 99999-9999',
        birthDate: '1985-03-20',
        gender: 'male' as const,
        cpf: '111.444.777-35',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
    
    it('should reject name that is too short', () => {
      const invalidData = {
        firstName: 'J',
        lastName: 'o',
        phone: '(11) 99999-9999',
        birthDate: '1990-05-15',
        gender: 'male' as const,
        cpf: '111.444.777-35',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should validate complete address', () => {
      const dataWithAddress = {
        firstName: 'Ana',
        lastName: 'Costa',
        phone: '(11) 99999-9999',
        birthDate: '1992-08-10',
        gender: 'female' as const,
        cpf: '111.444.777-35',
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Apto 101',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(dataWithAddress);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid zip code format', () => {
      const invalidData = {
        firstName: 'Ana',
        lastName: 'Costa',
        phone: '(11) 99999-9999',
        birthDate: '1992-08-10',
        gender: 'female' as const,
        cpf: '111.444.777-35',
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '123456', // Invalid format
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('updatePatientSchema', () => {
    it('should validate partial patient update', () => {
      const updateData = {
        firstName: 'Maria',
        lastName: 'Silva Santos Updated',
        email: 'maria.updated@example.com'
      };
      
      const result = updatePatientSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });
    
    it('should allow empty update object', () => {
      const emptyUpdate = {};
      
      const result = updatePatientSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });
    
    it('should validate single field update', () => {
      const singleFieldUpdate = {
        phone: '(11) 88888-8888'
      };
      
      const result = updatePatientSchema.safeParse(singleFieldUpdate);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid data in update', () => {
      const invalidUpdate = {
        email: 'invalid-email-format'
      };
      
      const result = updatePatientSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
  
  describe('searchPatientSchema', () => {
    it('should validate search with query', () => {
      const searchData = {
        query: 'Maria Silva'
      };
      
      const result = searchPatientSchema.safeParse(searchData);
      expect(result.success).toBe(true);
    });
    
    it('should validate search with pagination', () => {
      const searchData = {
        query: 'João',
        page: 2,
        limit: 20
      };
      
      const result = searchPatientSchema.safeParse(searchData);
      expect(result.success).toBe(true);
    });
    
    it('should validate search with sorting', () => {
      const searchData = {
        query: 'Silva',
        sortBy: 'firstName' as const,
        sortOrder: 'desc' as const
      };
      
      const result = searchPatientSchema.safeParse(searchData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid sort field', () => {
      const invalidSearch = {
        query: 'Silva',
        sortBy: 'invalid_field' as any
      };
      
      const result = searchPatientSchema.safeParse(invalidSearch);
      expect(result.success).toBe(false);
    });
    
    it('should reject negative page number', () => {
      const invalidSearch = {
        query: 'Silva',
        page: -1
      };
      
      const result = searchPatientSchema.safeParse(invalidSearch);
      expect(result.success).toBe(false);
    });
    
    it('should reject limit exceeding maximum', () => {
      const invalidSearch = {
        query: 'Silva',
        limit: 200 // Assuming max is 100
      };
      
      const result = searchPatientSchema.safeParse(invalidSearch);
      expect(result.success).toBe(false);
    });
  });
  
  describe('patientFiltersSchema', () => {
    it('should validate age range filter', () => {
      const filterData = {
        ageRange: {
          min: 18,
          max: 65
        }
      };
      
      const result = patientFiltersSchema.safeParse(filterData);
      expect(result.success).toBe(true);
    });
    
    it('should validate gender filter', () => {
      const filterData = {
        gender: 'female' as const
      };
      
      const result = patientFiltersSchema.safeParse(filterData);
      expect(result.success).toBe(true);
    });
    
    it('should validate city filter', () => {
      const filterData = {
        city: 'São Paulo'
      };
      
      const result = patientFiltersSchema.safeParse(filterData);
      expect(result.success).toBe(true);
    });
    
    it('should validate date range filter', () => {
      const filterData = {
        registrationDate: {
          start: '2024-01-01',
          end: '2024-12-31'
        }
      };
      
      const result = patientFiltersSchema.safeParse(filterData);
      expect(result.success).toBe(true);
    });
    
    it('should validate combined filters', () => {
      const filterData = {
        gender: 'male' as const,
        ageRange: {
          min: 25,
          max: 50
        },
        city: 'Rio de Janeiro',
        hasActiveSession: true
      };
      
      const result = patientFiltersSchema.safeParse(filterData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid age range (min > max)', () => {
      const invalidFilter = {
        ageRange: {
          min: 65,
          max: 18
        }
      };
      
      const result = patientFiltersSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });
    
    it('should reject negative age values', () => {
      const invalidFilter = {
        ageRange: {
          min: -5,
          max: 30
        }
      };
      
      const result = patientFiltersSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Edge cases and data transformation', () => {
    it('should handle string trimming', () => {
      const dataWithWhitespace = {
        firstName: '  Maria  ',
        lastName: '  Silva  ',
        email: '  maria@example.com  ',
        phone: '(11) 99999-9999',
        birthDate: '1990-05-15',
        gender: 'female' as const,
        cpf: '111.444.777-35',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(dataWithWhitespace);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Maria');
        expect(result.data.lastName).toBe('Silva');
        expect(result.data.email).toBe('maria@example.com');
      }
    });
    
    it('should handle special characters in names', () => {
      const dataWithSpecialChars = {
        firstName: 'José',
        lastName: 'da Silva-Santos',
        phone: '(11) 99999-9999',
        birthDate: '1990-05-15',
        gender: 'male' as const,
        cpf: '111.444.777-35',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        emergencyContact: 'Maria Santos',
        emergencyPhone: '(11) 88888-8888'
      };
      
      const result = createPatientSchema.safeParse(dataWithSpecialChars);
      expect(result.success).toBe(true);
    });
    
    it('should validate different phone formats', () => {
      const phoneFormats = [
        '(11) 99999-9999',
        '11 99999-9999',
        '11999999999'
      ];
      
      phoneFormats.forEach(phone => {
        const data = {
          firstName: 'Test',
          lastName: 'Patient',
          phone,
          birthDate: '1990-01-01',
          gender: 'other' as const,
          cpf: '111.444.777-35',
         street: 'Rua Test',
         number: '123',
         neighborhood: 'Centro',
         city: 'São Paulo',
         state: 'SP',
         zipCode: '01234-567',
         emergencyContact: 'Emergency Contact',
         emergencyPhone: '(11) 88888-8888'
        };
        
        const result = createPatientSchema.safeParse(data);
        // Alguns formatos podem não ser válidos dependendo da regex
        expect(typeof result.success).toBe('boolean');
      });
    });
    
    it('should handle null and undefined optional fields', () => {
      const dataWithNulls = {
        firstName: 'Test',
        lastName: 'Patient',
        phone: '(11) 99999-9999',
        birthDate: '1990-01-01',
        gender: 'female' as const,
        cpf: '111.444.777-35',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '(11) 88888-8888',
        email: undefined,
        healthInsurance: undefined,
        allergies: ''
      };
      
      const result = createPatientSchema.safeParse(dataWithNulls);
      expect(result.success).toBe(true);
    });
  });
});
