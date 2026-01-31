/**
 * useRecibos - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('recibos') → Firestore collection 'recibos'
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, addDoc, query as firestoreQuery, orderBy } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';



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

// Helper to convert Firestore doc to Recibo
const convertDocToRecibo = (doc: { id: string; data: () => Record<string, unknown> }): Recibo => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as Recibo;
};

export function useRecibos() {
  return useQuery({
    queryKey: ['recibos'],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'recibos'),
        orderBy('numero_recibo', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDocToRecibo);
    },
  });
}

export function useCreateRecibo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recibo: Omit<Recibo, 'id' | 'numero_recibo' | 'created_at'>) => {
      const reciboData = {
        ...recibo,
        numero_recibo: Date.now(), // Generate sequential number
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'recibos'), reciboData);
      const snapshot = await getDocs(firestoreQuery(collection(db, 'recibos')));
      const newDoc = snapshot.docs.find(doc => doc.id === docRef.id);

      if (!newDoc) throw new Error('Failed to create recibo');
      return convertDocToRecibo(newDoc);
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
