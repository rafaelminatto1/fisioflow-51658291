/**
 * Bulk Actions Hook - Agenda list comes from API; delete/update use API.
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/use-toast';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { AppointmentService } from '@/services/appointmentService';
import { getUserOrganizationId } from '@/utils/userHelpers';

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
      const organizationId = await getUserOrganizationId();
      if (!organizationId) {
        toast({ title: 'Erro', description: 'Organização não encontrada.', variant: 'destructive' });
        return;
      }
      const ids = Array.from(selectedIds);
      if (ids.length > 5) {
        toast({ title: 'Excluindo...', description: `${ids.length} agendamentos. Aguarde.` });
      }
      let errors = 0;
      for (const id of ids) {
        try {
          await AppointmentService.deleteAppointment(id, organizationId);
        } catch (err) {
          logger.error('Erro ao excluir agendamento', { id, err }, 'useBulkActions');
          errors++;
        }
      }

      if (errors > 0) {
        toast({
          title: 'Exclusão parcial',
          description: `${ids.length - errors} excluídos, ${errors} falha(s).`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso',
          description: `${selectedIds.size} agendamentos excluídos.`,
        });
      }

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
      const ids = Array.from(selectedIds);
      if (ids.length > 5) {
        toast({ title: 'Atualizando...', description: `${ids.length} agendamentos. Aguarde.` });
      }
      let errors = 0;
      for (const id of ids) {
        try {
          await AppointmentService.updateStatus(id, status);
        } catch (err) {
          logger.error('Erro ao atualizar status do agendamento', { id, err }, 'useBulkActions');
          errors++;
        }
      }

      if (errors > 0) {
        toast({
          title: 'Atualização parcial',
          description: `${ids.length - errors} atualizados, ${errors} falha(s).`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso',
          description: `${selectedIds.size} agendamentos atualizados para ${status}.`,
        });
      }

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
