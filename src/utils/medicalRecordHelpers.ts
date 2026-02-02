/**
 * Medical Record Helpers
 *
 * Helper functions for saving medical record data
 * Migrated from Supabase to Firebase Functions
 */

import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/functions';

export interface Surgery {
  name: string;
  date: string;
  surgeon: string;
  hospital: string;
  notes?: string;
}

export interface Goal {
  description: string;
  targetDate: string;
}

export interface Pathology {
  name: string;
  status: 'active' | 'treated';
  diagnosedAt: string;
}

/**
 * Save surgeries for a medical record
 * @param recordId - Medical record ID
 * @param newSurgeries - Array of surgeries to save
 */
export const saveSurgeries = async (
  recordId: string,
  newSurgeries: Surgery[]
) => {
  try {
    const saveSurgeriesFn = httpsCallable(getFirebaseFunctions(), 'saveSurgeries');
    const result = await saveSurgeriesFn({
      recordId,
      surgeries: newSurgeries,
    });

    if (result.data?.error) {
      throw new Error(result.data.error);
    }
  } catch (error) {
    logger.error('Error saving surgeries', error, 'medicalRecordHelpers');
    toast.error('Erro ao salvar cirurgias');
    throw error;
  }
};

/**
 * Save goals for a medical record
 * @param recordId - Medical record ID
 * @param newGoals - Array of goals to save
 */
export const saveGoals = async (
  recordId: string,
  newGoals: Goal[]
) => {
  try {
    const saveGoalsFn = httpsCallable(getFirebaseFunctions(), 'saveGoals');
    const result = await saveGoalsFn({
      recordId,
      goals: newGoals,
    });

    if (result.data?.error) {
      throw new Error(result.data.error);
    }
  } catch (error) {
    logger.error('Error saving goals', error, 'medicalRecordHelpers');
    toast.error('Erro ao salvar objetivos');
    throw error;
  }
};

/**
 * Save pathologies for a medical record
 * @param recordId - Medical record ID
 * @param newPathologies - Array of pathologies to save
 */
export const savePathologies = async (
  recordId: string,
  newPathologies: Pathology[]
) => {
  try {
    const savePathologiesFn = httpsCallable(getFirebaseFunctions(), 'savePathologies');
    const result = await savePathologiesFn({
      recordId,
      pathologies: newPathologies,
    });

    if (result.data?.error) {
      throw new Error(result.data.error);
    }
  } catch (error) {
    logger.error('Error saving pathologies', error, 'medicalRecordHelpers');
    toast.error('Erro ao salvar patologias');
    throw error;
  }
};
