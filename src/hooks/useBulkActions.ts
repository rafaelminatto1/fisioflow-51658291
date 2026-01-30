/**
 * Bulk Actions Hook - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('appointments').delete() → Firestore batch delete
 * - supabase.from('appointments').update() → Firestore batch update
 * - Removed supabase client dependency
 *
 * Provides functionality for bulk operations on appointments
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/integrations/firebase/app';
import { collection, doc, writeBatch } from 'firebase/firestore';
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
      const batch = writeBatch(db);

      // Firestore batch operations are limited to 500 operations
      const ids = Array.from(selectedIds);
      const chunks = [];
      for (let i = 0; i < ids.length; i += 500) {
        chunks.push(ids.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const chunkBatch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(db, 'appointments', id);
          chunkBatch.delete(docRef);
        });
        await chunkBatch.commit();
      }

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

      // Firestore batch operations are limited to 500 operations
      const ids = Array.from(selectedIds);
      const chunks = [];
      for (let i = 0; i < ids.length; i += 500) {
        chunks.push(ids.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const chunkBatch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(db, 'appointments', id);
          chunkBatch.update(docRef, { status });
        });
        await chunkBatch.commit();
      }

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
