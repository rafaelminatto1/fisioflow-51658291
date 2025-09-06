import { useState } from 'react';
import { toast } from 'sonner';

export function useSOAPRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addRecord = async (recordData: any) => {
    console.log('Adding SOAP record:', recordData);
    return { id: 'mock-id', ...recordData };
  };

  const updateRecord = async (id: string, updates: any) => {
    console.log('Updating SOAP record:', id, updates);
  };

  return {
    records,
    loading,
    fetchRecords: async () => {},
    getRecordsByPatient: async (id: string) => [],
    addRecord,
    updateRecord,
    signRecord: async (id: string) => {},
    deleteRecord: async (id: string) => {},
  };
}