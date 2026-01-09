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

    // Use UTC for consistent calculations, then apply offset for Brasilia (UTC-3)
    // Note: This is a simplified handling. For strict correctness consider date-fns-tz or similar.
    const now = new Date();
    // Brasilia is UTC-3. We want to find appointments for 'tomorrow' in Brasilia time.

    // Get current time in Brasilia
    const brasiliaOffset = -3 * 60 * 60 * 1000;
    const nowBrasilia = new Date(now.getTime() + brasiliaOffset);

    // Prepare 24h target (Tomorrow in Brasilia)
    const tomorrowBrasilia = new Date(nowBrasilia.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDateString = tomorrowBrasilia.toISOString().split('T')[0];

    // Buscar agendamentos que precisam de lembrete de 24h
    // We compare against the date string column 'appointment_date'
    const { data: appointments24h } = await supabase
      .from('appointments')
      .select(`
        *,
        patients(id, name, phone)
      `)
      .is('reminder_sent_24h', null)
      .eq('appointment_date', tomorrowDateString); // Exact match for the date string

    // Buscar agendamentos que precisam de lembrete de 2h
    // Here logic needs to be precise with time
    const { data: appointments2h } = await supabase
      .from('appointments')
      .select(`
        *,
        patients(id, name, phone)
      `)
      .is('reminder_sent_2h', null)
      .eq('appointment_date', nowBrasilia.toISOString().split('T')[0]); // Must be today

    const results = {
      reminders_24h: 0,
      reminders_2h: 0,
      errors: [] as string[],
    };

    // Helper for batched parallel execution
    const processInBatches = async <T>(
      items: T[],
      batchSize: number,
      processFn: (item: T) => Promise<void>
    ) => {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(processFn));
      }
    };

    // Enviar lembretes de 24h (parallel, batched)
    if (appointments24h && appointments24h.length > 0) {
      console.log(`Processing ${appointments24h.length} 24h reminders...`);
      await processInBatches(appointments24h, 5, async (apt) => {
        try {
          const message = `🏥 *Lembrete de Consulta - Activity Fisioterapia*

Olá *${apt.patients.name}*!

Você tem uma consulta agendada para amanhã:

📅 *Data:* ${new Date(apt.appointment_date).toLocaleDateString('pt-BR')}
⏰ *Horário:* ${apt.appointment_time}

⚠️ Em caso de cancelamento, favor avisar com 24h de antecedência.

Até breve! 💙`;

          await supabase.functions.invoke('send-whatsapp', {
            body: { to: apt.patients.phone, message }
          });

          await supabase.from('whatsapp_messages').insert({
            appointment_id: apt.id,
            patient_id: apt.patient_id,
            message_type: 'reminder_24h',
            message_content: message,
            status: 'sent'
          });

          await supabase
            .from('appointments')
            .update({ reminder_sent_24h: now.toISOString() })
            .eq('id', apt.id);

          results.reminders_24h++;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`Error sending 24h reminder for ${apt.id}:`, errMsg);
          results.errors.push(`24h reminder ${apt.id}: ${errMsg}`);
        }
      });
    }

    // Enviar lembretes de 2h (parallel, batched)
    if (appointments2h && appointments2h.length > 0) {
      console.log(`Processing ${appointments2h.length} 2h reminders...`);
      await processInBatches(appointments2h, 5, async (apt) => {
        try {
          const aptTime = apt.appointment_time.split(':');
          const aptDateTime = new Date(apt.appointment_date);
          aptDateTime.setHours(parseInt(aptTime[0]), parseInt(aptTime[1]));

          const timeDiff = aptDateTime.getTime() - now.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          if (hoursDiff >= 1.5 && hoursDiff <= 2.5) {
            const message = `⏰ *Lembrete Urgente - Activity Fisioterapia*

Olá *${apt.patients.name}*!

Sua consulta é daqui a 2 horas:

⏰ *Horário:* ${apt.appointment_time}
📍 *Local:* ${apt.room || 'Consultório principal'}

Nos vemos em breve! 💙`;

            await supabase.functions.invoke('send-whatsapp', {
              body: { to: apt.patients.phone, message }
            });

            await supabase.from('whatsapp_messages').insert({
              appointment_id: apt.id,
              patient_id: apt.patient_id,
              message_type: 'reminder_2h',
              message_content: message,
              status: 'sent'
            });

            await supabase
              .from('appointments')
              .update({ reminder_sent_2h: now.toISOString() })
              .eq('id', apt.id);

            results.reminders_2h++;
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`Error sending 2h reminder for ${apt.id}:`, errMsg);
          results.errors.push(`2h reminder ${apt.id}: ${errMsg}`);
        }
      });
    }

    console.log('Reminders processed:', results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
