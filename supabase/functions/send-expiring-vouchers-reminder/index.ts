import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface removida - usando tipos inline

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting - função executada via cron, mas adicionamos proteção
    const rateLimitResult = await checkRateLimit(req, 'send-expiring-vouchers-reminder', { maxRequests: 10, windowMinutes: 60 });
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit excedido para send-expiring-vouchers-reminder: ${rateLimitResult.current_count}/${rateLimitResult.limit}`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Calcular datas para verificar expiração em 7, 3 e 1 dia
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    const in1Day = new Date(today);
    in1Day.setDate(today.getDate() + 1);
    const in1DayStr = in1Day.toISOString().split('T')[0];

    console.log(`📅 Buscando vouchers expirando em 7, 3 e 1 dia(s)`);

    // Buscar vouchers ativos que expiram em 7, 3 ou 1 dia
    // user_vouchers.user_id referencia auth.users, precisamos buscar via profiles
    const { data: vouchers, error } = await supabase
      .from('user_vouchers')
      .select(`
        id,
        user_id,
        voucher_id,
        sessoes_restantes,
        sessoes_totais,
        data_expiracao,
        ativo,
        vouchers:voucher_id (
          nome,
          descricao
        )
      `)
      .eq('ativo', true)
      .gt('sessoes_restantes', 0);

    if (error) {
      console.error('Erro ao buscar vouchers:', error);
      throw error;
    }

    // Filtrar vouchers que expiram em 7, 3 ou 1 dia
    const expiringVouchers = (vouchers || []).filter((v: any) => {
      const expiryDate = new Date(v.data_expiracao).toISOString().split('T')[0];
      return [in7DaysStr, in3DaysStr, in1DayStr].includes(expiryDate);
    });

    console.log(`⚠️  Encontrados ${expiringVouchers.length} vouchers expirando em breve`);

    const results = {
      total: expiringVouchers.length,
      sent_7d: 0,
      sent_3d: 0,
      sent_1d: 0,
      errors: [] as string[],
    };

    // Processar cada voucher
    for (const voucher of expiringVouchers) {
      try {
        if (!voucher.vouchers) {
          console.warn(`Voucher ${voucher.id} sem dados de voucher, pulando`);
          continue;
        }

        // Buscar dados do perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .eq('user_id', voucher.user_id)
          .single();

        if (profileError || !profile) {
          console.warn(`Perfil não encontrado para user_id ${voucher.user_id}, pulando`);
          continue;
        }

        const patient = {
          name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
        };

        const voucherInfo = {
          name: voucher.vouchers.nome || 'Pacote',
          sessions: voucher.sessoes_totais,
        };
        const expiryDate = new Date(voucher.data_expiracao);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Determinar qual mensagem enviar baseado nos dias restantes
        let daysText = '';
        if (daysUntilExpiry === 7) {
          daysText = '7 dias';
          results.sent_7d++;
        } else if (daysUntilExpiry === 3) {
          daysText = '3 dias';
          results.sent_3d++;
        } else if (daysUntilExpiry === 1) {
          daysText = '1 dia';
          results.sent_1d++;
        } else {
          // Não enviar se não for exatamente 7, 3 ou 1 dia
          continue;
        }

        // Buscar preferências de notificação
        // Verificar se payment_reminders está habilitado na tabela notification_preferences
        let paymentRemindersEnabled = true;
        try {
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('payment_reminders')
            .eq('user_id', voucher.user_id)
            .single();

          if (prefs) {
            paymentRemindersEnabled = prefs.payment_reminders ?? true;
          }
        } catch (prefsError) {
          // Se não houver preferências, usar padrão (habilitado)
          console.log(`Preferências não encontradas para usuário ${voucher.user_id}, usando padrão`);
        }

        if (!paymentRemindersEnabled) {
          console.log(`Lembretes de pagamento desabilitados para usuário ${voucher.user_id}, pulando`);
          continue;
        }

        const sendEmail = true;
        const sendWhatsApp = true;

        // Mensagem de lembrete
        const reminderMessage = `⚠️ *Lembrete - Pacote Expirando - Activity Fisioterapia*

Olá *${patient.name}*!

Seu pacote *${voucherInfo.name}* está próximo do vencimento:

📦 *Pacote:* ${voucherInfo.name}
📅 *Expira em:* ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'dia' : 'dias'} (${new Date(voucher.data_expiracao).toLocaleDateString('pt-BR')})
🎯 *Sessões restantes:* ${voucher.sessoes_restantes} de ${voucherInfo.sessions}

Não perca suas sessões! Agende seus atendimentos antes do vencimento.

Equipe Activity Fisioterapia 💙`;

        // Enviar via WhatsApp se telefone disponível
        if (sendWhatsApp && patient.phone) {
          try {
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                to: patient.phone,
                message: reminderMessage,
              },
            });
            console.log(`✅ WhatsApp enviado para ${patient.name} sobre voucher expirando em ${daysText}`);
          } catch (whatsappError) {
            console.error(`Erro ao enviar WhatsApp para ${patient.name}:`, whatsappError);
            results.errors.push(`WhatsApp ${patient.name}: ${whatsappError.message}`);
          }
        }

        // Enviar via Email se email disponível
        if (sendEmail && patient.email) {
          try {
            await supabase.functions.invoke('send-appointment-email', {
              body: {
                patientEmail: patient.email,
                patientName: patient.name,
                action: 'expiring_voucher',
                clinicName: 'Activity Fisioterapia',
              },
            });
            console.log(`✅ Email enviado para ${patient.name} sobre voucher expirando em ${daysText}`);
          } catch (emailError) {
            console.error(`Erro ao enviar email para ${patient.name}:`, emailError);
            results.errors.push(`Email ${patient.name}: ${emailError.message}`);
          }
        }

        // Registrar envio
        try {
          await supabase
            .from('whatsapp_messages')
            .insert({
              patient_id: voucher.user_id,
              message_type: `voucher_expiring_${daysUntilExpiry}d`,
              message_content: reminderMessage,
              status: 'sent',
            });
        } catch (logError) {
          console.warn('Erro ao registrar mensagem de voucher expirando:', logError);
        }
      } catch (voucherError) {
        const errorMsg = `Erro ao processar voucher ${voucher.id}: ${voucherError.message}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log(`✅ Processamento concluído: ${results.sent_7d + results.sent_3d + results.sent_1d} mensagens enviadas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${results.total} vouchers expirando, ${results.sent_7d + results.sent_3d + results.sent_1d} mensagens enviadas`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao processar vouchers expirando:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

