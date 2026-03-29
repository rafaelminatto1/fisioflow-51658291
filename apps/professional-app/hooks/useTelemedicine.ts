import { useState, useEffect, useCallback } from 'react';
import { ApiTelemedicineRoom, getTelemedicineRooms, createTelemedicineRoom, startTelemedicineRoom } from '../lib/api';

export function useTelemedicine() {
  const [rooms, setRooms] = useState<ApiTelemedicineRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTelemedicineRooms();
      setRooms(data);
      setError(null);
    } catch (err) {
      console.error('[useTelemedicine] Error fetching:', err);
      setError('Erro ao carregar salas de telemedicina');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  }, [fetchRooms]);

  const createRoom = useCallback(async (patientId: string) => {
    try {
      const newRoom = await createTelemedicineRoom(patientId);
      setRooms(prev => [newRoom, ...prev]);
      return newRoom;
    } catch (err) {
      console.error('[useTelemedicine] Error creating:', err);
      throw err;
    }
  }, []);

  const startRoom = useCallback(async (id: string) => {
    try {
      const updated = await startTelemedicineRoom(id);
      setRooms(prev => prev.map(r => r.id === id ? updated : r));
      return updated;
    } catch (err) {
      console.error('[useTelemedicine] Error starting:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    refreshing,
    error,
    refresh,
    createRoom,
    startRoom,
  };
}
