import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Buscar agendamentos que precisam de lembrete de 24h
    const { data: appointments24h } = await supabase
      .from('appointments')
      .select(`
        *,
        patients(id, name, phone)
      `)
      .is('reminder_sent_24h', null)
      .gte('appointment_date', in24Hours.toISOString().split('T')[0])
      .lte('appointment_date', in24Hours.toISOString().split('T')[0]);

    // Buscar agendamentos que precisam de lembrete de 2h
    const { data: appointments2h } = await supabase
      .from('appointments')
      .select(`
        *,
        patients(id, name, phone)
      `)
      .is('reminder_sent_2h', null)
      .gte('appointment_date', now.toISOString().split('T')[0])
      .lte('appointment_date', now.toISOString().split('T')[0]);

    const results = {
      reminders_24h: 0,
      reminders_2h: 0,
      errors: [] as string[],
    };

    // Enviar lembretes de 24h
    if (appointments24h && appointments24h.length > 0) {
      for (const apt of appointments24h) {
        try {
          const message = `🏥 *Lembrete de Consulta - Activity Fisioterapia*

Olá *${apt.patients.name}*!

Você tem uma consulta agendada para amanhã:

📅 *Data:* ${new Date(apt.appointment_date).toLocaleDateString('pt-BR')}
⏰ *Horário:* ${apt.appointment_time}

⚠️ Em caso de cancelamento, favor avisar com 24h de antecedência.

Até breve! 💙`;

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: apt.patients.phone,
              message
            }
          });

          // Registrar envio
          await supabase
            .from('whatsapp_messages')
            .insert({
              appointment_id: apt.id,
              patient_id: apt.patient_id,
              message_type: 'reminder_24h',
              message_content: message,
              status: 'sent'
            });

          // Marcar lembrete como enviado
          await supabase
            .from('appointments')
            .update({ reminder_sent_24h: now.toISOString() })
            .eq('id', apt.id);

          results.reminders_24h++;
        } catch (error) {
          results.errors.push(`Erro ao enviar lembrete 24h para ${apt.id}: ${error.message}`);
        }
      }
    }

    // Enviar lembretes de 2h
    if (appointments2h && appointments2h.length > 0) {
      for (const apt of appointments2h) {
        try {
          const aptTime = apt.appointment_time.split(':');
          const aptDateTime = new Date(apt.appointment_date);
          aptDateTime.setHours(parseInt(aptTime[0]), parseInt(aptTime[1]));

          const timeDiff = aptDateTime.getTime() - now.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          // Só enviar se faltarem entre 1.5 e 2.5 horas
          if (hoursDiff >= 1.5 && hoursDiff <= 2.5) {
            const message = `⏰ *Lembrete Urgente - Activity Fisioterapia*

Olá *${apt.patients.name}*!

Sua consulta é daqui a 2 horas:

⏰ *Horário:* ${apt.appointment_time}
📍 *Local:* ${apt.room || 'Consultório principal'}

Nos vemos em breve! 💙`;

            await supabase.functions.invoke('send-whatsapp', {
              body: {
                to: apt.patients.phone,
                message
              }
            });

            // Registrar envio
            await supabase
              .from('whatsapp_messages')
              .insert({
                appointment_id: apt.id,
                patient_id: apt.patient_id,
                message_type: 'reminder_2h',
                message_content: message,
                status: 'sent'
              });

            // Marcar lembrete como enviado
            await supabase
              .from('appointments')
              .update({ reminder_sent_2h: now.toISOString() })
              .eq('id', apt.id);

            results.reminders_2h++;
          }
        } catch (error) {
          results.errors.push(`Erro ao enviar lembrete 2h para ${apt.id}: ${error.message}`);
        }
      }
    }

    console.log('Lembretes enviados:', results);

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
