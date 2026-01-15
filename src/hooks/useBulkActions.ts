import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';

export function useBulkActions() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const queryClient = useQueryClient();

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set()); // Clear on exit
      }
      return !prev;
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${selectedIds.size} agendamentos excluídos.`,
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      clearSelection();
      setIsSelectionMode(false);
    } catch (error) {
      logger.error('Erro ao excluir agendamentos em massa', error, 'useBulkActions');
      toast({
        title: 'Erro',
        description: 'Falha ao excluir agendamentos.',
        variant: 'destructive',
      });
    }
  }, [selectedIds, queryClient, clearSelection]);

  const updateStatusSelected = useCallback(async (status: string) => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${selectedIds.size} agendamentos atualizados para ${status}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      clearSelection();
      setIsSelectionMode(false);
    } catch (error) {
      logger.error('Erro ao atualizar status em massa', error, 'useBulkActions');
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status.',
        variant: 'destructive',
      });
    }
  }, [selectedIds, queryClient, clearSelection]);

  return {
    selectedIds,
    isSelectionMode,
    toggleSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    deleteSelected,
    updateStatusSelected,
  };
}
