import { useState, useEffect, useCallback } from "react";
import { telemedicineApi } from "../lib/api";
import { TelemedicineRoom } from "../types/api";

export function useTelemedicine() {
  const [rooms, setRooms] = useState<TelemedicineRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await telemedicineApi.getRooms();
      setRooms(data);
      setError(null);
    } catch (err) {
      console.error("[useTelemedicine] Error fetching:", err);
      setError("Erro ao carregar teleconsultas");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  }, [fetchRooms]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const activeRoom = rooms.find((r) => r.status === "ativo");

  return {
    rooms,
    activeRoom,
    loading,
    refreshing,
    error,
    refresh,
  };
}
