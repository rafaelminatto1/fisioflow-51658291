import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PatientRiskProfile {
  patientId: string;
  patientName: string;
  phone: string;
  noShowRate: number;
  totalAppointments: number;
  lastNoShow: string | null;
  riskLevel: 'low' | 'medium' | 'high';
  suggestedActions: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    console.log('🔍 Iniciando lembretes inteligentes para:', tomorrowDate);

    // Buscar agendamentos de amanhã com histórico do paciente
    const { data: appointments, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        patient_id,
        confirmation_status,
        patients!inner(
          id,
          name,
          phone,
          email
        )
      `)
      .eq('appointment_date', tomorrowDate)
      .in('status', ['scheduled', 'confirmed']);

    if (aptError) {
      console.error('Erro ao buscar agendamentos:', aptError);
      throw aptError;
    }

    console.log(`📅 ${appointments?.length || 0} agendamentos encontrados para amanhã`);

    const results = {
      analyzed: 0,
      highRiskReminders: 0,
      mediumRiskReminders: 0,
      standardReminders: 0,
      errors: [] as string[],
    };

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum agendamento para amanhã', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analisar cada paciente
    for (const apt of appointments) {
      try {
        const patient = apt.patients as { id: string; name: string; phone: string; email: string };
        
        // Buscar histórico do paciente
        const { data: history } = await supabase
          .from('appointments')
          .select('id, status, appointment_date')
          .eq('patient_id', patient.id)
          .lt('appointment_date', now.toISOString().split('T')[0])
          .order('appointment_date', { ascending: false })
          .limit(20);

        const totalAppointments = history?.length || 0;
        const noShows = history?.filter(h => h.status === 'no_show')?.length || 0;
        const noShowRate = totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;
        const lastNoShow = history?.find(h => h.status === 'no_show')?.appointment_date || null;

        // Calcular nível de risco
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        const suggestedActions: string[] = [];

        if (noShowRate >= 30 || (noShows >= 2 && totalAppointments <= 5)) {
          riskLevel = 'high';
          suggestedActions.push('Enviar lembrete extra 4h antes');
          suggestedActions.push('Ligar para confirmar');
          suggestedActions.push('Considerar cobrança de taxa de no-show');
        } else if (noShowRate >= 15 || noShows >= 1) {
          riskLevel = 'medium';
          suggestedActions.push('Enviar lembrete personalizado');
          suggestedActions.push('Pedir confirmação por WhatsApp');
        }

        // Registrar predição
        await supabase.from('appointment_predictions').insert({
          patient_id: patient.id,
          appointment_id: apt.id,
          no_show_probability: noShowRate,
          risk_factors: {
            total_appointments: totalAppointments,
            no_shows: noShows,
            last_no_show: lastNoShow,
            risk_level: riskLevel
          },
          recommended_actions: suggestedActions,
          prediction_date: now.toISOString()
        });

        results.analyzed++;

        // Enviar lembrete baseado no risco
        let message = '';
        
        if (riskLevel === 'high') {
          message = `🏥 *Activity Fisioterapia - Confirmação Importante*

Olá *${patient.name}*!

Você tem uma consulta agendada para *amanhã*:

📅 *Data:* ${new Date(apt.appointment_date).toLocaleDateString('pt-BR')}
⏰ *Horário:* ${apt.appointment_time}

⚠️ *Por favor, confirme sua presença* respondendo esta mensagem com:
✅ SIM - para confirmar
❌ NÃO - para cancelar

Lembre-se: cancelamentos devem ser feitos com 24h de antecedência para evitar taxas.

Contamos com você! 💙`;
          results.highRiskReminders++;
        } else if (riskLevel === 'medium') {
          message = `🏥 *Lembrete - Activity Fisioterapia*

Olá *${patient.name}*!

Sua consulta é amanhã:

📅 ${new Date(apt.appointment_date).toLocaleDateString('pt-BR')} às ${apt.appointment_time}

Por favor, confirme sua presença respondendo *SIM*.

Até amanhã! 💙`;
          results.mediumRiskReminders++;
        } else {
          message = `🏥 *Lembrete de Consulta*

Olá *${patient.name}*!

Sua consulta está agendada para amanhã:
📅 ${new Date(apt.appointment_date).toLocaleDateString('pt-BR')} às ${apt.appointment_time}

Até breve! 💙`;
          results.standardReminders++;
        }

        // Enviar via WhatsApp se tiver telefone
        if (patient.phone) {
          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: patient.phone,
              message
            }
          });

          console.log(`✅ Lembrete ${riskLevel} enviado para ${patient.name}`);
        }

        // Registrar comunicação
        const { data: orgData } = await supabase
          .from('profiles')
          .select('organization_id')
          .single();

        if (orgData?.organization_id) {
          await supabase.from('communication_logs').insert({
            organization_id: orgData.organization_id,
            patient_id: patient.id,
            appointment_id: apt.id,
            type: 'whatsapp',
            recipient: patient.phone,
            body: message,
            status: 'sent',
            template_name: `smart_reminder_${riskLevel}`
          });
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        results.errors.push(`Erro para agendamento ${apt.id}: ${errorMsg}`);
        console.error(`❌ Erro:`, errorMsg);
      }
    }

    console.log('📊 Resultados:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lembretes inteligentes processados',
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
