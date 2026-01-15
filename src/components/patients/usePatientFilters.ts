import { useState, useMemo, useCallback } from 'react';
import type { PatientFilters } from './patientFiltersUtils';
import { countActiveFilters } from './patientFiltersUtils';
import type { Patient } from '@/hooks/usePatientCrud';

interface UsePatientFiltersOptions {
  patients: Patient[];
  statsMap: Record<string, import('@/hooks/usePatientStats').PatientStats>;
}

interface UsePatientFiltersReturn {
  // Filter states
  searchTerm: string;
  statusFilter: string;
  conditionFilter: string;
  advancedFilters: PatientFilters;

  // Computed values
  filteredPatients: Patient[];
  activeFiltersCount: number;
  uniqueConditions: string[];

  // Actions
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setConditionFilter: (condition: string) => void;
  setAdvancedFilters: (filters: PatientFilters) => void;
  clearAdvancedFilters: () => void;
  clearAllFilters: () => void;
}

/**
 * Hook customizado para gerenciar filtros de pacientes
 * Centraliza toda a lógica de filtragem em um só lugar
 */
export const usePatientFilters = ({
  patients,
  statsMap: _statsMap,
}: UsePatientFiltersOptions): UsePatientFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [advancedFilters, setAdvancedFilters] = useState<PatientFilters>({});

  // Get unique conditions for filter dropdown
  const uniqueConditions = useMemo(() => {
    const conditions = [...new Set(patients.map((p) => p.main_condition).filter(Boolean))];
    return conditions.sort();
  }, [patients]);

  // Count total active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (conditionFilter !== 'all') count++;
    if (searchTerm.trim()) count++;
    count += countActiveFilters(advancedFilters);
    return count;
  }, [statusFilter, conditionFilter, searchTerm, advancedFilters]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const patientName = patient.name || patient.full_name || '';
      const matchesSearch =
        patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.main_condition || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
      const matchesCondition = conditionFilter === 'all' || patient.main_condition === conditionFilter;

      // Advanced filters are applied via matchesFilters utility
      // This would need to be imported and used here
      const matchesAdvanced = true; // Placeholder for advanced filter logic

      return matchesSearch && matchesStatus && matchesCondition && matchesAdvanced;
    });
  }, [patients, searchTerm, statusFilter, conditionFilter]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setConditionFilter('all');
    setAdvancedFilters({});
  }, []);

  // Clear only advanced filters
  const clearAdvancedFilters = useCallback(() => {
    setAdvancedFilters({});
  }, []);

  return {
    // Filter states
    searchTerm,
    statusFilter,
    conditionFilter,
    advancedFilters,

    // Computed values
    filteredPatients,
    activeFiltersCount,
    uniqueConditions,

    // Actions
    setSearchTerm,
    setStatusFilter,
    setConditionFilter,
    setAdvancedFilters,
    clearAdvancedFilters,
    clearAllFilters,
  };
};
