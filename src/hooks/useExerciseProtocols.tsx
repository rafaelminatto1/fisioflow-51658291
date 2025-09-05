import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ExerciseProtocol {
  id: string;
  name: string;
  condition: string;
  description?: string;
  exercises: Record<string, unknown>[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface CreateProtocolData {
  name: string;
  condition: string;
  description?: string;
  exercises: Record<string, unknown>[];
}

export function useExerciseProtocols() {
  const [protocols, setProtocols] = useState<ExerciseProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercise_protocols')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProtocols: ExerciseProtocol[] = (data || []).map(protocol => ({
        ...protocol,
        exercises: Array.isArray(protocol.exercises) ? protocol.exercises : []
      }));
      setProtocols(formattedProtocols);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar protocolos');
      console.error('Erro ao carregar protocolos:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProtocol = async (protocolData: CreateProtocolData) => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para criar protocolos',
        variant: 'destructive'
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('exercise_protocols')
        .insert({
          ...protocolData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProtocols();
      toast({
        title: 'Protocolo criado',
        description: `${protocolData.name} foi criado com sucesso`
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar protocolo';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateProtocol = async (id: string, updates: Partial<CreateProtocolData>) => {
    try {
      const { data, error } = await supabase
        .from('exercise_protocols')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchProtocols();
      toast({
        title: 'Protocolo atualizado',
        description: 'Protocolo foi atualizado com sucesso'
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar protocolo';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    }
  };

  const deleteProtocol = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exercise_protocols')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchProtocols();
      toast({
        title: 'Protocolo excluído',
        description: 'Protocolo foi excluído com sucesso'
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir protocolo';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  };

  const getProtocolsByCondition = (condition: string) => {
    return protocols.filter(protocol => 
      protocol.condition.toLowerCase().includes(condition.toLowerCase())
    );
  };

  const applyProtocolToPatient = async (protocolId: string, patientId: string) => {
    const protocol = protocols.find(p => p.id === protocolId);
    if (!protocol) {
      toast({
        title: 'Erro',
        description: 'Protocolo não encontrado',
        variant: 'destructive'
      });
      return false;
    }

    try {
      // Criar plano de exercícios para o paciente
      const { data: planData, error: planError } = await supabase
        .from('exercise_plans')
        .insert({
          patient_id: patientId,
          name: `${protocol.name} - ${protocol.condition}`,
          description: protocol.description,
          created_by: user?.id
        })
        .select()
        .single();

      if (planError) throw planError;

      // Adicionar exercícios do protocolo ao plano
      const exerciseItems = protocol.exercises.map(exercise => ({
        exercise_plan_id: planData.id,
        exercise_id: exercise.id,
        sets: exercise.sets || 3,
        reps: exercise.reps || 10,
        rest_time: exercise.rest_time || 60,
        order_index: exercise.order || 0,
        notes: exercise.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('exercise_plan_items')
        .insert(exerciseItems);

      if (itemsError) throw itemsError;

      toast({
        title: 'Protocolo aplicado',
        description: `${protocol.name} foi aplicado ao paciente com sucesso`
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao aplicar protocolo';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    fetchProtocols();
  }, []);

  return {
    protocols,
    loading,
    error,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    getProtocolsByCondition,
    applyProtocolToPatient,
    refetch: fetchProtocols
  };
}