import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SoapRecord {
  id: string;
  patient_id: string;
  appointment_id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  record_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  signed_at?: string;
}

export interface CreateSoapRecordData {
  patient_id: string;
  appointment_id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  record_date?: string;
}

// Hook para buscar registros SOAP de um paciente
export const useSoapRecords = (patientId: string, limit = 10) => {
  return useQuery({
    queryKey: ['soap-records', patientId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soap_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as SoapRecord[];
    },
    enabled: !!patientId
  });
};

// Hook para buscar um registro SOAP específico
export const useSoapRecord = (recordId: string) => {
  return useQuery({
    queryKey: ['soap-record', recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soap_records')
        .select('*')
        .eq('id', recordId)
        .single();
      
      if (error) throw error;
      return data as SoapRecord;
    },
    enabled: !!recordId
  });
};

// Hook para criar um registro SOAP
export const useCreateSoapRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSoapRecordData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const recordData = {
        ...data,
        created_by: userData.user.id,
        record_date: data.record_date || new Date().toISOString().split('T')[0]
      };

      const { data: record, error } = await supabase
        .from('soap_records')
        .insert(recordData)
        .select()
        .single();
      
      if (error) throw error;
      return record as SoapRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records', data.patient_id] });
      toast({
        title: 'Evolução salva',
        description: 'A evolução do paciente foi registrada com sucesso.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar evolução',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

// Hook para atualizar um registro SOAP
export const useUpdateSoapRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: Partial<CreateSoapRecordData> }) => {
      const { data: record, error } = await supabase
        .from('soap_records')
        .update(data)
        .eq('id', recordId)
        .select()
        .single();
      
      if (error) throw error;
      return record as SoapRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['soap-record', data.id] });
      toast({
        title: 'Evolução atualizada',
        description: 'A evolução foi atualizada com sucesso.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar evolução',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

// Hook para assinar (finalizar) um registro SOAP
export const useSignSoapRecord = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recordId: string) => {
      const { data: record, error } = await supabase
        .from('soap_records')
        .update({ signed_at: new Date().toISOString() })
        .eq('id', recordId)
        .select()
        .single();
      
      if (error) throw error;
      return record as SoapRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['soap-records', data.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['soap-record', data.id] });
      toast({
        title: 'Evolução assinada',
        description: 'A evolução foi assinada e não pode mais ser editada.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao assinar evolução',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};
