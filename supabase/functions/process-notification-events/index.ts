import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { errorResponse, successResponse } from '../_shared/api-helpers.ts'
import { captureException, captureMessage } from '../_shared/sentry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EventPayload {
  eventType: string
  data: Record<string, unknown>
  userId?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: EventPayload = await req.json()

    // Validate required fields
    if (!payload.eventType || !payload.data) {
      return errorResponse('Campos obrigatórios ausentes: eventType, data', 400);
    }

    await captureMessage(`Processando evento: ${payload.eventType}`, 'info', { eventType: payload.eventType });

    // Get active triggers for this event type
    const { data: triggers, error: triggersError } = await supabaseClient
      .from('notification_triggers')
      .select('*, notification_templates(*)')
      .eq('event_type', payload.eventType)
      .eq('active', true)

    if (triggersError) {
      throw triggersError
    }

    if (!triggers || triggers.length === 0) {
      await captureMessage(`Nenhum trigger ativo encontrado para evento: ${payload.eventType}`, 'info');
      return successResponse({ message: 'Nenhum trigger encontrado para este tipo de evento' });
    }

    const processedTriggers = []

    // Process each trigger
    for (const trigger of triggers) {
      try {
        // Check if trigger conditions are met
        if (!evaluateConditions(trigger.conditions, payload.data)) {
          await captureMessage(`Condições do trigger não atendidas: ${trigger.name}`, 'info');
          continue
        }

        const template = trigger.notification_templates
        if (!template || !template.active) {
          await captureMessage(`Template não encontrado ou inativo: ${trigger.template_type}`, 'info');
          continue
        }

        // Determine target users
        const targetUsers = await getTargetUsers(supabaseClient, payload, trigger)

        // Process notifications for each user
        for (const userId of targetUsers) {
          // Render template with event data
          const title = renderTemplate(template.title_template, payload.data)
          const body = renderTemplate(template.body_template, payload.data)

          // Schedule or send notification
          if (trigger.schedule_delay_minutes > 0) {
            // Schedule for later
            const scheduleAt = new Date(Date.now() + trigger.schedule_delay_minutes * 60 * 1000)
            
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/schedule-notifications`, {
              method: 'POST',
              headers: {
                'Authorization': req.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId,
                type: template.type,
                scheduleAt: scheduleAt.toISOString(),
                data: {
                  ...payload.data,
                  triggerId: trigger.id,
                  eventType: payload.eventType
                }
              })
            })
          } else {
            // Send immediately
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
              method: 'POST',
              headers: {
                'Authorization': req.headers.get('Authorization') || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId,
                type: template.type,
                title,
                body,
                data: {
                  ...payload.data,
                  triggerId: trigger.id,
                  eventType: payload.eventType
                },
                actions: template.actions
              })
            })
          }
        }

        processedTriggers.push({
          triggerId: trigger.id,
          triggerName: trigger.name,
          targetUsers: targetUsers.length,
          scheduled: trigger.schedule_delay_minutes > 0
        })

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        await captureException(err, { trigger: trigger.name, eventType: payload.eventType });
      }
    }

    return successResponse({
      message: 'Evento processado',
      eventType: payload.eventType,
      processedTriggers
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await captureException(err, { function: 'process-notification-events' });
    
    return errorResponse('Erro ao processar eventos de notificação', 500);
  }
})

// Helper function to render templates
function renderTemplate(template: string, data: Record<string, unknown>): string {
  let rendered = template
  
  // Simple template rendering - replace {{key}} with data[key]
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(data[key] || ''))
  })
  
  return rendered
}

// Evaluate trigger conditions
function evaluateConditions(conditions: Record<string, unknown>, eventData: Record<string, unknown>): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true // No conditions means always trigger
  }

  // Simple condition evaluation
  for (const [key, expectedValue] of Object.entries(conditions)) {
    if (key === 'advance_hours') {
      // Special handling for appointment reminders
      continue
    }
    
    if (key === 'milestone_check') {
      // Special handling for exercise milestones
      if (expectedValue && !checkExerciseMilestone(eventData)) {
        return false
      }
      continue
    }
    
    if (key === 'days_before') {
      // Special handling for payment reminders
      continue
    }
    
    // Generic condition check
    if (eventData[key] !== expectedValue) {
      return false
    }
  }
  
  return true
}

// Check if exercise completion represents a milestone
function checkExerciseMilestone(eventData: Record<string, unknown>): boolean {
  // This would implement milestone logic based on your exercise system
  // For example: completed 7 days in a row, reached 50 exercises, etc.
  const completedCount = eventData.completedCount || 0
  const streakDays = eventData.streakDays || 0
  
  // Example milestones
  return completedCount % 10 === 0 || // Every 10 exercises
         streakDays === 7 ||          // 7-day streak
         streakDays === 30            // 30-day streak
}

// Get target users for notification
async function getTargetUsers(supabaseClient: SupabaseClient, payload: EventPayload, trigger: Record<string, unknown>): Promise<string[]> {
  // If userId is specified in payload, use that
  if (payload.userId) {
    return [payload.userId]
  }
  
  // Determine users based on event type and data
  switch (payload.eventType) {
    case 'appointment_created':
    case 'appointment_updated':
      return payload.data.patient_id ? [payload.data.patient_id] : []
      
    case 'exercise_prescribed':
    case 'exercise_completed':
      return payload.data.patient_id ? [payload.data.patient_id] : []
      
    case 'treatment_plan_updated':
      return payload.data.patient_id ? [payload.data.patient_id] : []
      
    case 'message_received':
      return payload.data.recipient_id ? [payload.data.recipient_id] : []
      
    case 'payment_due':
      return payload.data.patient_id ? [payload.data.patient_id] : []
      
    case 'patient_inactive':
      // Notify therapist about inactive patient
      if (payload.data.therapist_id) {
        return [payload.data.therapist_id]
      }
      break
      
    case 'high_pain_report':
      // Notify therapist about high pain report
      if (payload.data.therapist_id) {
        return [payload.data.therapist_id]
      }
      break
      
    case 'system_maintenance':
    case 'system_alert': {
      // Broadcast to all active users
      const { data: users } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('active', true);
      
      return users ? users.map((u: { id: string }) => u.id) : [];
    }
      
    default:
      await captureMessage(`Tipo de evento desconhecido: ${payload.eventType}`, 'warning', { eventType: payload.eventType });
      return []
  }
  
  return []
}