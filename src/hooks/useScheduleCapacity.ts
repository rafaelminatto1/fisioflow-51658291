/**
 * useScheduleCapacity - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, setDoc, query as firestoreQuery, where, orderBy, db } from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { fisioLogger as logger } from '@/lib/errors/logger';

const capacitySchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string(),
  end_time: z.string(),
  max_patients: z.number().min(1).max(20),
});

export type CapacityFormData = z.infer<typeof capacitySchema>;

export interface ScheduleCapacity {
  id: string;
  organization_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_patients: number;
  created_at: string;
  updated_at: string;
}

/** Grupo de capacidades com mesmo horário e vagas (para exibição agrupada) */
export interface CapacityGroup {
  start_time: string;
  end_time: string;
  max_patients: number;
  ids: string[];
  days: number[];
}

// Helper to convert doc
const convertDoc = (doc: { id: string; data: () => Record<string, unknown> }): ScheduleCapacity => ({ id: doc.id, ...doc.data() } as ScheduleCapacity);

export function useScheduleCapacity() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Validate user ID format (must be UUID) - Firebase IDs are not UUIDs usually, but generic check
  const isValidUserId = !!user?.uid;

  const organizationId = profile?.organization_id;

  // Cache por 2 min para evitar refetch ao trocar de aba
  const STALE_TIME_MS = 2 * 60 * 1000;

  const { data: capacities, isLoading } = useQuery({
    queryKey: ['schedule-capacity', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const q = firestoreQuery(
        collection(db, 'schedule_capacity_config'),
        where('organization_id', '==', organizationId),
        orderBy('day_of_week', 'asc'),
        orderBy('start_time', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc);
    },
    enabled: !!organizationId,
    staleTime: STALE_TIME_MS,
  });

  const createCapacity = useMutation({
    mutationFn: async (formData: CapacityFormData) => {
      if (!organizationId) {
        throw new Error('Organização não encontrada. Tente novamente.');
      }

      // Garantir que o perfil no Firestore tenha organization_id e role para as regras de segurança
      if (user?.uid) {
        logger.debug('[useScheduleCapacity] Syncing profile to Firestore before save', { uid: user.uid, organizationId, role: profile?.role }, 'useScheduleCapacity');
        try {
          await setDoc(
            doc(db, 'profiles', user.uid),
            {
              organization_id: organizationId,
              role: profile?.role ?? 'fisioterapeuta',
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          );
          logger.debug('[useScheduleCapacity] Profile synced successfully', {}, 'useScheduleCapacity');
        } catch (profileErr) {
          logger.warn('[useScheduleCapacity] Profile sync failed (continuing with addDoc)', { error: profileErr }, 'useScheduleCapacity');
        }
      }

      const validated = capacitySchema.parse(formData);
      logger.debug('[useScheduleCapacity] Adding capacity doc to Firestore', { organization_id: organizationId, day_of_week: validated.day_of_week }, 'useScheduleCapacity');

      const docRef = await addDoc(collection(db, 'schedule_capacity_config'), {
        day_of_week: validated.day_of_week,
        start_time: validated.start_time,
        end_time: validated.end_time,
        max_patients: validated.max_patients,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const newDoc = await getDoc(docRef);
      return convertDoc(newDoc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity', organizationId] });
      toast({
        title: 'Configuração salva',
        description: 'A capacidade de horário foi configurada com sucesso.',
      });
    },
    onError: (error: Error & { code?: string }) => {
      logger.error('[useScheduleCapacity] createCapacity failed', { message: error.message, code: error.code, stack: error.stack }, 'useScheduleCapacity');
      toast({
        title: 'Erro ao salvar configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Criar múltiplas configurações (uma para cada dia selecionado)
  const createMultipleCapacities = useMutation({
    mutationFn: async (formDataArray: CapacityFormData[]) => {
      if (!organizationId) {
        throw new Error('Organização não encontrada. Tente novamente.');
      }

      // Garantir que o perfil no Firestore tenha organization_id e role para as regras de segurança
      if (user?.uid) {
        logger.debug('[useScheduleCapacity] createMultiple: syncing profile', { uid: user.uid, organizationId }, 'useScheduleCapacity');
        try {
          await setDoc(
            doc(db, 'profiles', user.uid),
            {
              organization_id: organizationId,
              role: profile?.role ?? 'fisioterapeuta',
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          );
          logger.debug('[useScheduleCapacity] createMultiple: profile synced', {}, 'useScheduleCapacity');
        } catch (profileErr) {
          logger.warn('[useScheduleCapacity] createMultiple: profile sync failed', { error: profileErr }, 'useScheduleCapacity');
        }
      }

      logger.debug('[useScheduleCapacity] createMultiple: adding capacity docs', { count: formDataArray.length }, 'useScheduleCapacity');
      const promises = formDataArray.map(async formData => {
        const validated = capacitySchema.parse(formData);
        const docRef = await addDoc(collection(db, 'schedule_capacity_config'), {
          day_of_week: validated.day_of_week,
          start_time: validated.start_time,
          end_time: validated.end_time,
          max_patients: validated.max_patients,
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        const newDoc = await getDoc(docRef);
        return convertDoc(newDoc);
      });

      return await Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity', organizationId] });
      const count = data?.length || 0;
      toast({
        title: 'Configurações salvas',
        description: `${count} configuração(ões) de capacidade foram salvas com sucesso.`,
      });
    },
    onError: (error: Error & { code?: string }) => {
      logger.error('[useScheduleCapacity] createMultipleCapacities failed', { message: error.message, code: error.code }, 'useScheduleCapacity');
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateCapacity = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CapacityFormData> & { id: string }) => {
      if (!organizationId) {
        throw new Error('Organização não encontrada. Tente novamente.');
      }

      const docRef = doc(db, 'schedule_capacity_config', id);
      await updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity'] });
      toast({
        title: 'Configuração atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCapacity = useMutation({
    mutationFn: async (id: string) => {
      if (!organizationId) {
        throw new Error('Organização não encontrada. Tente novamente.');
      }

      await deleteDoc(doc(db, 'schedule_capacity_config', id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity'] });
      toast({
        title: 'Configuração removida',
        description: 'A configuração foi removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateCapacityGroup = useMutation({
    mutationFn: async ({ ids, max_patients }: { ids: string[]; max_patients: number }) => {
      if (!organizationId) {
        throw new Error('Organização não encontrada. Tente novamente.');
      }
      const updated_at = new Date().toISOString();
      await Promise.all(
        ids.map((id) => updateDoc(doc(db, 'schedule_capacity_config', id), { max_patients, updated_at }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity'] });
      toast({
        title: 'Configuração atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCapacityGroup = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!organizationId) {
        throw new Error('Organização não encontrada. Tente novamente.');
      }
      await Promise.all(ids.map((id) => deleteDoc(doc(db, 'schedule_capacity_config', id))));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-capacity'] });
      toast({
        title: 'Configuração removida',
        description: 'A configuração foi removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover configuração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper para converter horário em minutos
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Verifica se dois intervalos de tempo se sobrepõem
  const checkTimeOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const start1Min = timeToMinutes(start1);
    const end1Min = timeToMinutes(end1);
    const start2Min = timeToMinutes(start2);
    const end2Min = timeToMinutes(end2);

    // Dois intervalos se sobrepõem se:
    // - O início do novo está dentro do existente, OU
    // - O fim do novo está dentro do existente, OU
    // - O novo contém completamente o existente
    return (
      (start2Min >= start1Min && start2Min < end1Min) ||
      (end2Min > start1Min && end2Min <= end1Min) ||
      (start2Min <= start1Min && end2Min >= end1Min)
    );
  };

  // Verifica conflitos com configurações existentes
  const checkConflicts = (
    selectedDays: number[],
    startTime: string,
    endTime: string
  ): { hasConflict: boolean; conflicts: Array<{ day: number; dayLabel: string; start: string; end: string }> } => {
    if (!capacities || capacities.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    const conflicts: Array<{ day: number; dayLabel: string; start: string; end: string }> = [];
    const dayLabels: Record<number, string> = {
      0: 'Domingo',
      1: 'Segunda-feira',
      2: 'Terça-feira',
      3: 'Quarta-feira',
      4: 'Quinta-feira',
      5: 'Sexta-feira',
      6: 'Sábado',
    };

    for (const day of selectedDays) {
      const existingConfigs = capacities.filter(c => c.day_of_week === day);

      for (const config of existingConfigs) {
        if (checkTimeOverlap(config.start_time, config.end_time, startTime, endTime)) {
          conflicts.push({
            day,
            dayLabel: dayLabels[day],
            start: config.start_time,
            end: config.end_time,
          });
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  };

  // Helper para obter capacidade de um horário específico
  const getCapacityForTime = (dayOfWeek: number, time: string): number => {
    if (!capacities) return 1; // Default: 1 paciente por horário

    const timeMinutes = timeToMinutes(time);

    const matchingConfig = capacities.find(config => {
      if (config.day_of_week !== dayOfWeek) return false;

      const startTime = timeToMinutes(config.start_time);
      const endTime = timeToMinutes(config.end_time);

      return timeMinutes >= startTime && timeMinutes < endTime;
    });

    return matchingConfig?.max_patients || 1;
  };

  const daysOfWeek = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
  ];

  // Agrupa capacidades por (start_time, end_time, max_patients); ordenado por horário e dias
  const capacityGroups: CapacityGroup[] = (() => {
    const list = capacities || [];
    if (list.length === 0) return [];
    const key = (c: ScheduleCapacity) => `${c.start_time}|${c.end_time}|${c.max_patients}`;
    const map = new Map<string, ScheduleCapacity[]>();
    for (const c of list) {
      const k = key(c);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    const groups: CapacityGroup[] = Array.from(map.entries()).map(([, items]) => ({
      start_time: items[0].start_time,
      end_time: items[0].end_time,
      max_patients: items[0].max_patients,
      ids: items.map((i) => i.id),
      days: [...new Set(items.map((i) => i.day_of_week))].sort((a, b) => a - b),
    }));
    groups.sort((a, b) => {
      const tA = timeToMinutes(a.start_time);
      const tB = timeToMinutes(b.start_time);
      if (tA !== tB) return tA - tB;
      const dA = a.days[0] ?? 0;
      const dB = b.days[0] ?? 0;
      return dA - dB;
    });
    return groups;
  })();

  return {
    capacities: capacities || [],
    capacityGroups,
    isLoading,
    daysOfWeek,
    organizationId,
    createCapacity: createCapacity.mutate,
    createMultipleCapacities: createMultipleCapacities.mutate,
    updateCapacity: updateCapacity.mutate,
    deleteCapacity: deleteCapacity.mutate,
    updateCapacityGroup: updateCapacityGroup.mutate,
    deleteCapacityGroup: deleteCapacityGroup.mutate,
    getCapacityForTime,
    checkConflicts,
    isCreating: createCapacity.isPending || createMultipleCapacities.isPending,
    isUpdating: updateCapacity.isPending || updateCapacityGroup.isPending,
    isDeleting: deleteCapacity.isPending || deleteCapacityGroup.isPending,
    authError: !isValidUserId ? 'Sessão de usuário inválida' : null,
  };
}

