import { useState, useEffect, useCallback } from 'react';
import { ApiLead, getLeads, updateLead } from '../lib/api';

export function useLeads() {
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLeads();
      setLeads(data);
      setError(null);
    } catch (err) {
      console.error('[useLeads] Error fetching:', err);
      setError('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  }, [fetchLeads]);

  const updateLeadStatus = useCallback(async (id: string, estagio: ApiLead['estagio']) => {
    try {
      const updated = await updateLead(id, { estagio });
      setLeads(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      console.error('[useLeads] Error updating status:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    loading,
    refreshing,
    error,
    refresh,
    updateLeadStatus,
    setLeads,
  };
}
