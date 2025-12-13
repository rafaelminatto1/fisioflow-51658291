import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation helpers
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function validateNotificationPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload inválido' }
  }
  
  if (!payload.userId || typeof payload.userId !== 'string' || !isValidUUID(payload.userId)) {
    return { valid: false, error: 'userId deve ser um UUID válido' }
  }
  
  if (!payload.type || typeof payload.type !== 'string' || payload.type.length > 50) {
    return { valid: false, error: 'type é obrigatório (máximo 50 caracteres)' }
  }
  
  if (!payload.title || typeof payload.title !== 'string' || payload.title.length > 100) {
    return { valid: false, error: 'title é obrigatório (máximo 100 caracteres)' }
  }
  
  if (!payload.body || typeof payload.body !== 'string' || payload.body.length > 500) {
    return { valid: false, error: 'body é obrigatório (máximo 500 caracteres)' }
  }
  
  if (payload.actions && !Array.isArray(payload.actions)) {
    return { valid: false, error: 'actions deve ser um array' }
  }
  
  return { valid: true }
}

// Generic error response for security
function safeErrorResponse(requestId: string) {
  return new Response(
    JSON.stringify({ 
      error: 'Erro ao processar requisição. Tente novamente mais tarde.',
      requestId 
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse and validate request body
    let payload
    try {
      payload = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisição inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validation = validateNotificationPayload(payload)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user should receive this notification type
    const { data: shouldSend } = await supabaseClient.rpc('should_send_notification', {
      p_user_id: payload.userId,
      p_notification_type: payload.type
    })

    if (!shouldSend) {
      console.log(`[send-notification] Blocked by preferences: ${payload.userId}, ${payload.type}`)
      return new Response(
        JSON.stringify({ message: 'Notificação bloqueada por preferências do usuário' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', payload.userId)

    if (subscriptionsError) {
      console.error('[send-notification] Subscriptions error:', {
        requestId,
        error: subscriptionsError,
        timestamp: new Date().toISOString()
      })
      return safeErrorResponse(requestId)
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[send-notification] No subscriptions found: ${payload.userId}`)
      return new Response(
        JSON.stringify({ message: 'Nenhuma assinatura de push encontrada' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log notification in history
    const { data: notificationRecord, error: logError } = await supabaseClient.rpc('log_notification', {
      p_user_id: payload.userId,
      p_type: payload.type,
      p_title: payload.title,
      p_body: payload.body,
      p_data: payload.data || {},
      p_status: 'sent'
    })

    if (logError) {
      console.error('[send-notification] Log error:', {
        requestId,
        error: logError,
        timestamp: new Date().toISOString()
      })
    }

    // Prepare push notification payload
    const pushPayload = {
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        ...payload.data,
        notificationId: notificationRecord,
        type: payload.type,
        timestamp: Date.now()
      },
      actions: payload.actions || []
    }

    // Send push notifications to all user subscriptions
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: subscription.endpoint.split('/').pop(),
            notification: {
              title: pushPayload.title,
              body: pushPayload.body,
              icon: pushPayload.icon,
              badge: pushPayload.badge
            },
            data: pushPayload.data,
            webpush: {
              headers: {
                'TTL': '86400'
              },
              notification: {
                title: pushPayload.title,
                body: pushPayload.body,
                icon: pushPayload.icon,
                badge: pushPayload.badge,
                actions: pushPayload.actions,
                data: pushPayload.data
              }
            }
          })
        })

        if (!response.ok) {
          throw new Error('FCM request failed')
        }

        const result = await response.json()
        console.log('[send-notification] Push sent successfully')
        
        return { success: true, subscription: subscription.id }
      } catch (error) {
        console.error('[send-notification] Push failed:', {
          requestId,
          subscriptionId: subscription.id,
          timestamp: new Date().toISOString()
        })
        
        // Update notification status to failed
        if (notificationRecord) {
          await supabaseClient.rpc('update_notification_status', {
            p_notification_id: notificationRecord,
            p_status: 'failed',
            p_error_message: 'Falha no envio'
          })
        }
        
        return { success: false, subscription: subscription.id }
      }
    })

    const results = await Promise.all(pushPromises)
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`[send-notification] Complete: ${successCount} success, ${failureCount} failures`)

    return new Response(
      JSON.stringify({
        message: 'Notificação enviada',
        notificationId: notificationRecord,
        results: {
          total: results.length,
          success: successCount,
          failures: failureCount
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[send-notification] Unexpected error:', {
      requestId,
      error,
      timestamp: new Date().toISOString()
    })
    
    return safeErrorResponse(requestId)
  }
})
