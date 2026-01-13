import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useWhatsAppIntegration() {
  const sendMessage = useMutation({
    mutationFn: async (data: { recipient: string; message: string; templateId?: string }) => {
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('*')
        .single();

      if (!config || !config.enabled) {
        throw new Error('WhatsApp não está configurado');
      }

      // Salvar mensagem no banco
      const { data: message } = await supabase
        .from('whatsapp_messages')
        .insert([{
          recipient: data.recipient,
          message: data.message,
          template_id: data.templateId,
          status: 'pending',
        }])
        .select()
        .single();

      // Enviar via API (simulado)
      // Em produção, chamaria a API do WhatsApp Business
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar status
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', message?.id);

      return message;
    },
    onSuccess: () => {
      toast.success('Mensagem enviada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });

  return { sendMessage };
}
