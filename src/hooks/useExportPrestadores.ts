import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useExportPrestadores() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (eventoId: string) => {
      const { data, error } = await supabase
        .from('prestadores')
        .select('*')
        .eq('evento_id', eventoId)
        .order('nome', { ascending: true });

      if (error) throw error;

      // Criar CSV
      const headers = ['Nome', 'Contato', 'CPF/CNPJ', 'Valor Acordado', 'Status Pagamento'];
      const csvContent = [
        headers.join(','),
        ...data.map(p => [
          `"${p.nome}"`,
          `"${p.contato || ''}"`,
          `"${p.cpf_cnpj || ''}"`,
          Number(p.valor_acordado).toFixed(2),
          p.status_pagamento
        ].join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `prestadores_${eventoId}_${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Exportação concluída!',
        description: 'CSV de prestadores baixado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao exportar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
