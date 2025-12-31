import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BirthdayPatient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birth_date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting - função executada via cron, mas adicionamos proteção
    const rateLimitResult = await checkRateLimit(req, 'send-birthday-message', { maxRequests: 10, windowMinutes: 60 });
    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit excedido para send-birthday-message: ${rateLimitResult.current_count}/${rateLimitResult.limit}`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();

    console.log(`🎂 Buscando pacientes com aniversário em ${todayDay}/${todayMonth}`);

    // Buscar pacientes com aniversário hoje
    // Usar EXTRACT para comparar mês e dia, ignorando o ano
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id, name, email, phone, birth_date')
      .eq('status', 'active')
      .not('birth_date', 'is', null);

    if (error) {
      console.error('Erro ao buscar pacientes:', error);
      throw error;
    }

    // Filtrar pacientes com aniversário hoje
    const birthdayPatients = (patients || []).filter((patient: BirthdayPatient) => {
      if (!patient.birth_date) return false;
      const birthDate = new Date(patient.birth_date);
      return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay;
    });

    console.log(`🎉 Encontrados ${birthdayPatients.length} pacientes com aniversário hoje`);

    const results = {
      total: birthdayPatients.length,
      sent: 0,
      errors: [] as string[],
    };

    // Enviar mensagens para cada paciente
    for (const patient of birthdayPatients) {
      try {
        // Calcular idade
        const birthDate = new Date(patient.birth_date);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;

        // Buscar preferências de notificação do paciente
        // A tabela notification_preferences usa user_id (auth.users.id), não patient.id
        // Por enquanto, vamos assumir que email e WhatsApp estão habilitados por padrão
        // TODO: Implementar mapeamento de patient_id para user_id se necessário
        const sendEmail = true;
        const sendWhatsApp = true;

        // Mensagem de aniversário
        const birthdayMessage = `🎉 *Parabéns ${patient.name}!*

Hoje é seu aniversário! 🎂🎈

Desejamos um dia muito especial e que você continue cuidando da sua saúde e bem-estar.

Muito sucesso em sua jornada de recuperação!

Equipe Activity Fisioterapia 💙`;

        // Enviar via WhatsApp se telefone disponível
        if (sendWhatsApp && patient.phone) {
          try {
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                to: patient.phone,
                message: birthdayMessage,
              },
            });
            console.log(`✅ WhatsApp enviado para ${patient.name} (${patient.phone})`);
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
                action: 'birthday',
                clinicName: 'Activity Fisioterapia',
              },
            });
            console.log(`✅ Email enviado para ${patient.name} (${patient.email})`);
          } catch (emailError) {
            console.error(`Erro ao enviar email para ${patient.name}:`, emailError);
            results.errors.push(`Email ${patient.name}: ${emailError.message}`);
          }
        }

        // Registrar envio na tabela de notificações (se existir)
        try {
          await supabase
            .from('whatsapp_messages')
            .insert({
              patient_id: patient.id,
              message_type: 'birthday',
              message_content: birthdayMessage,
              status: 'sent',
            });
        } catch (logError) {
          // Não falhar se não conseguir registrar
          console.warn('Erro ao registrar mensagem de aniversário:', logError);
        }

        results.sent++;
      } catch (patientError) {
        const errorMsg = `Erro ao processar paciente ${patient.name}: ${patientError.message}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log(`✅ Processamento concluído: ${results.sent}/${results.total} mensagens enviadas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${results.total} aniversariantes, ${results.sent} mensagens enviadas`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao processar aniversários:', error);
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

