import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, any>
  actions?: Array<{ action: string; title: string; icon?: string }>
  scheduleAt?: string
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

    // Parse request body
    const payload: NotificationPayload = await req.json()

    // Validate required fields
    if (!payload.userId || !payload.type || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user should receive this notification type
    const { data: shouldSend } = await supabaseClient.rpc('should_send_notification', {
      p_user_id: payload.userId,
      p_notification_type: payload.type
    })

    if (!shouldSend) {
      console.log(`Notification blocked by user preferences: ${payload.userId}, ${payload.type}`)
      return new Response(
        JSON.stringify({ message: 'Notification blocked by user preferences' }),
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
      throw subscriptionsError
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user: ${payload.userId}`)
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found' }),
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
      console.error('Failed to log notification:', logError)
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
            to: subscription.endpoint.split('/').pop(), // Extract registration token
            notification: {
              title: pushPayload.title,
              body: pushPayload.body,
              icon: pushPayload.icon,
              badge: pushPayload.badge
            },
            data: pushPayload.data,
            webpush: {
              headers: {
                'TTL': '86400' // 24 hours
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
          throw new Error(`FCM request failed: ${response.status}`)
        }

        const result = await response.json()
        console.log('Push notification sent successfully:', result)
        
        return { success: true, subscription: subscription.id }
      } catch (error) {
        console.error('Failed to send push notification:', error)
        
        // Update notification status to failed
        if (notificationRecord) {
          await supabaseClient.rpc('update_notification_status', {
            p_notification_id: notificationRecord,
            p_status: 'failed',
            p_error_message: error.message
          })
        }
        
        return { success: false, subscription: subscription.id, error: error.message }
      }
    })

    const results = await Promise.all(pushPromises)
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`Notification delivery complete: ${successCount} success, ${failureCount} failures`)

    return new Response(
      JSON.stringify({
        message: 'Notification sent',
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
    console.error('Error in send-notification function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})