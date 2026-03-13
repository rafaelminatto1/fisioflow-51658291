import { useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { patientsApi, marketingApi, type PatientRow } from '@/lib/api/workers-client';
import { toast } from 'sonner';
import { Cake, Sparkles } from 'lucide-react';
import React from 'react';

/**
 * Hook para gerenciar notificações e automação de aniversários
 */
export function useBirthdayNotification() {
  const { data: patients = [] } = useQuery({
    queryKey: ['patients-birthdays-today'],
    queryFn: async () => {
      const res = await patientsApi.list({ status: 'ativo', limit: 1000 });
      const today = new Date();
      const month = today.getUTCMonth() + 1;
      const day = today.getUTCDate();

      return (res?.data ?? []).filter((p: PatientRow) => {
        if (!p.birth_date) return false;
        const bDay = new Date(p.birth_date);
        return (bDay.getUTCMonth() + 1) === month && bDay.getUTCDate() === day;
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ patientId, phone }: { patientId: string, phone: string }) => {
      // Simular envio de mensagem via marketing API
      // Na prática, isso poderia disparar um WhatsApp ou Email via Worker
      return marketingApi.campaigns.sendQuickMessage({
        patientId,
        type: 'birthday_discount',
        template: `Parabéns! Hoje é seu dia especial e a FisioFlow tem um presente: use o cupom NIVER10 para 10% de desconto na sua próxima sessão!`
      });
    },
    onSuccess: (_, variables) => {
      toast.success(`Mensagem de parabéns enviada!`);
    }
  });

  // Notificar o profissional quando houver aniversariantes ao abrir a agenda/dashboard
  useEffect(() => {
    if (patients.length > 0) {
      const names = patients.map(p => p.name || p.full_name).join(', ');
      toast(`Aniversariantes de Hoje! 🎉`, {
        description: `${names} estão fazendo aniversário hoje. Que tal enviar um parabéns?`,
        icon: React.createElement(Cake, { className: "h-5 w-5 text-pink-500" }),
        duration: 10000,
      });
    }
  }, [patients.length]);

  return {
    birthdaysToday: patients,
    sendBirthdayMessage: (patientId: string, phone: string) => sendMessageMutation.mutate({ patientId, phone }),
    isSending: sendMessageMutation.isPending
  };
}
