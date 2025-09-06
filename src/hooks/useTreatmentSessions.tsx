import { useState } from 'react';

export function useTreatmentSessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  return {
    sessions,
    loading,
    fetchSessions: async () => {},
    addSession: async (data: any) => ({ id: 'mock', ...data }),
    addTreatmentSession: async (data: any) => ({ id: 'mock', ...data }),
    updateSession: async (id: string, data: any) => {},
    deleteSession: async (id: string) => {},
  };
}