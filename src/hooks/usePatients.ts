import { useState, useEffect } from 'react';
import { Patient } from '@/types';

export const useActivePatients = () => {
  const [data, setData] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMockPatients = async () => {
      try {
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { mockPatients } = await import('@/lib/mockData');
        setData(mockPatients.filter(p => p.status === 'Em Tratamento' || p.status === 'Inicial'));
        setIsLoading(false);
      } catch (err) {
        setError('Erro ao carregar pacientes');
        setIsLoading(false);
      }
    };

    loadMockPatients();
  }, []);

  return { data, isLoading, error };
};

export const usePatients = () => {
  return useActivePatients();
};