import { useState } from 'react';

interface SOAPRecord {
  id?: string;
  patient_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  created_at?: string;
  updated_at?: string;
}

export function useSOAPRecords() {
  const [records] = useState<SOAPRecord[]>([]);
  const [loading] = useState(false);

  const addRecord = async (recordData: Omit<SOAPRecord, 'id'>) => {
    console.log('Adding SOAP record:', recordData);
    return { id: 'mock-id', ...recordData };
  };

  const updateRecord = async (id: string, updates: Partial<SOAPRecord>) => {
    console.log('Updating SOAP record:', id, updates);
  };

  return {
    records,
    loading,
    fetchRecords: async () => {},
    getRecordsByPatient: async (_id: string) => [],
    addRecord,
    updateRecord,
    signRecord: async (_id: string) => {},
    deleteRecord: async (_id: string) => {},
  };
}