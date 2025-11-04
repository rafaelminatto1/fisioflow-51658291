import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScheduleNotificationPayload {
  userId?: string
  type: string
  scheduleAt: string
  data?: Record<string, any>
  recurring?: boolean
  cronExpression?: string
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

    // Handle different HTTP methods
    if (req.method === 'POST') {
      // Schedule a new notification
      const payload: ScheduleNotificationPayload = await req.json()
      
      // Validate required fields
      if (!payload.type || !payload.scheduleAt) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: type, scheduleAt' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get notification template
      const { data: template, error: templateError } = await supabaseClient
        .from('notification_templates')
        .select('*')
        .eq('type', payload.type)
        .single()

      if (templateError || !template) {
        return new Response(
          JSON.stringify({ error: 'Notification template not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Render template with data
      const title = renderTemplate(template.title_template, payload.data || {})
      const body = renderTemplate(template.body_template, payload.data || {})

      // If userId is provided, schedule for specific user
      if (payload.userId) {
        const scheduleTime = new Date(payload.scheduleAt)
        const now = new Date()
        
        if (scheduleTime <= now) {
          // Send immediately
          const sendResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization') || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: payload.userId,
              type: payload.type,
              title,
              body,
              data: payload.data,
              actions: template.actions
            })
          })

          const sendResult = await sendResponse.json()
          return new Response(
            JSON.stringify({ message: 'Notification sent immediately', result: sendResult }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        } else {
          // Schedule for later (this would integrate with a job queue in production)
          console.log(`Notification scheduled for ${scheduleTime.toISOString()}`)
          
          return new Response(
            JSON.stringify({ 
              message: 'Notification scheduled', 
              scheduleAt: scheduleTime.toISOString(),
              type: payload.type,
              userId: payload.userId
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      } else {
        // Broadcast to all users (admin feature)
        const { data: users, error: usersError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('active', true)

        if (usersError) {
          throw usersError
        }

        const broadcastPromises = users.map(user => 
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Authorization': req.headers.get('Authorization') || '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: user.id,
              type: payload.type,
              title,
              body,
              data: payload.data,
              actions: template.actions
            })
          })
        )

        const results = await Promise.allSettled(broadcastPromises)
        const successCount = results.filter(r => r.status === 'fulfilled').length
        const failureCount = results.filter(r => r.status === 'rejected').length

        return new Response(
          JSON.stringify({
            message: 'Broadcast notification sent',
            results: {
              total: users.length,
              success: successCount,
              failures: failureCount
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else if (req.method === 'GET') {
      // Process scheduled notifications (called by cron job)
      await processScheduledNotifications(supabaseClient, req)
      
      return new Response(
        JSON.stringify({ message: 'Scheduled notifications processed' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in schedule-notifications function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to render templates
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template
  
  // Simple template rendering - replace {{key}} with data[key]
  Object.keys(data).forEach(key => {
    const placeholder = `{{${key}}}`
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(data[key] || ''))
  })
  
  return rendered
}

// Process scheduled notifications (appointment reminders, etc.)
async function processScheduledNotifications(supabaseClient: any, req: Request) {
  const now = new Date()
  
  // Process appointment reminders
  await processAppointmentReminders(supabaseClient, now, req)
  
  // Process exercise reminders
  await processExerciseReminders(supabaseClient, now, req)
  
  // Process payment reminders
  await processPaymentReminders(supabaseClient, now, req)
}

async function processAppointmentReminders(supabaseClient: any, now: Date, req: Request) {
  // Get appointments that need 24h reminders
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const { data: appointments24h } = await supabaseClient
    .from('appointments')
    .select('*, patients(*)')
    .gte('appointment_date', tomorrow.toISOString().split('T')[0])
    .lt('appointment_date', new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .eq('status', 'scheduled')

  // Send 24h reminders
  for (const appointment of appointments24h || []) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: appointment.patient_id,
        type: 'appointment_reminder',
        title: 'Lembrete de Consulta',
        body: `Você tem uma consulta agendada para amanhã às ${appointment.appointment_time}.`,
        data: {
          appointmentId: appointment.id,
          date: appointment.appointment_date,
          time: appointment.appointment_time
        }
      })
    })
  }

  // Get appointments that need 2h reminders
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const { data: appointments2h } = await supabaseClient
    .from('appointments')
    .select('*, patients(*)')
    .eq('appointment_date', now.toISOString().split('T')[0])
    .gte('appointment_time', twoHoursLater.toTimeString().split(' ')[0])
    .lt('appointment_time', new Date(twoHoursLater.getTime() + 30 * 60 * 1000).toTimeString().split(' ')[0])
    .eq('status', 'scheduled')

  // Send 2h reminders
  for (const appointment of appointments2h || []) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: appointment.patient_id,
        type: 'appointment_reminder',
        title: 'Consulta em 2 horas!',
        body: `Sua consulta está marcada para às ${appointment.appointment_time}. Não se esqueça!`,
        data: {
          appointmentId: appointment.id,
          date: appointment.appointment_date,
          time: appointment.appointment_time
        }
      })
    })
  }
}

async function processExerciseReminders(supabaseClient: any, now: Date, req: Request) {
  // This would process daily exercise reminders based on user preferences
  // Implementation depends on your exercise prescription system
  console.log('Processing exercise reminders...')
}

async function processPaymentReminders(supabaseClient: any, now: Date, req: Request) {
  // This would process payment due reminders
  // Implementation depends on your financial system
  console.log('Processing payment reminders...')
}