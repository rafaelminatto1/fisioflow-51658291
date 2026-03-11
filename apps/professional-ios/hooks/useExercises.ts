import { useEffect, useState, useCallback } from 'react';
import { api, profApi } from '@/lib/api';
import type { Exercise } from '@/types';

export function useExercises() {
  const [data, setData] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const exercises = await profApi.getExercises();
      const mapped: Exercise[] = exercises.map((item: any) => ({
        ...item,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
      }));
      setData(mapped);
    } catch (err) {
      console.error('Error fetching exercises:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getById = useCallback(async (id: string) => {
    const item = await api.get<any>(`/api/prof/exercises/${id}`);
    return {
      ...item,
      created_at: new Date(item.created_at),
      updated_at: new Date(item.updated_at),
    } as Exercise;
  }, []);

  return { data, loading, error, refetch: fetchData, getById };
}
