import { useState, useEffect } from 'react';
import { Patient } from '@/types';

export const useActivePatients = () => {
  const [data, setData] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading with mock data
    setTimeout(() => {
      setData([]);
      setIsLoading(false);
    }, 1000);
  }, []);

  return { data, isLoading, error };
};

export const usePatients = () => {
  return useActivePatients();
};