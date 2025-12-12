import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Recibo {
  id: string;
  numero_recibo: number;
  patient_id: string | null;
  valor: number;
  valor_extenso: string | null;
  referente: string;
  data_emissao: string;
  emitido_por: string;
  cpf_cnpj_emitente: string | null;
  assinado: boolean;
  created_at: string;
}

export function useRecibos() {
  return useQuery({
    queryKey: ['recibos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recibos')
        .select('*')
        .order('numero_recibo', { ascending: false });
      if (error) throw error;
      return data as Recibo[];
    },
  });
}

export function useCreateRecibo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recibo: Omit<Recibo, 'id' | 'numero_recibo' | 'created_at'>) => {
      const { data, error } = await supabase.from('recibos').insert(recibo).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recibos'] });
      toast.success('Recibo emitido com sucesso.');
    },
    onError: () => toast.error('Erro ao emitir recibo.'),
  });
}

// Helper para converter número em extenso
export function valorPorExtenso(valor: number): string {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezADezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (valor === 0) return 'zero reais';
  if (valor === 100) return 'cem reais';

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  let resultado = '';

  if (inteiro >= 1000) {
    const milhares = Math.floor(inteiro / 1000);
    resultado += milhares === 1 ? 'mil' : `${unidades[milhares]} mil`;
    const resto = inteiro % 1000;
    if (resto > 0) resultado += ' e ';
  }

  const resto = inteiro % 1000;
  if (resto >= 100) {
    resultado += centenas[Math.floor(resto / 100)];
    if (resto % 100 > 0) resultado += ' e ';
  }

  const dezena = resto % 100;
  if (dezena >= 10 && dezena <= 19) {
    resultado += dezADezenove[dezena - 10];
  } else {
    if (dezena >= 20) {
      resultado += dezenas[Math.floor(dezena / 10)];
      if (dezena % 10 > 0) resultado += ' e ';
    }
    if (dezena % 10 > 0 || (dezena < 10 && dezena > 0)) {
      resultado += unidades[dezena % 10];
    }
  }

  resultado += inteiro === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    resultado += ` e ${centavos} centavo${centavos > 1 ? 's' : ''}`;
  }

  return resultado;
}
