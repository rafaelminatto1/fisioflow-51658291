import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StatusUpdatePayload {
  notificationId: string
  status: 'delivered' | 'clicked' | 'failed'
  errorMessage?: string
  timestamp?: number
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

    if (req.method === 'POST') {
      // Update notification status
      const payload: StatusUpdatePayload = await req.json()

      // Validate required fields
      if (!payload.notificationId || !payload.status) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: notificationId, status' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update notification status in database
      const { data, error } = await supabaseClient.rpc('update_notification_status', {
        p_notification_id: payload.notificationId,
        p_status: payload.status,
        p_error_message: payload.errorMessage || null
      })

      if (error) {
        throw error
      }

      console.log(`Notification status updated: ${payload.notificationId} -> ${payload.status}`)

      return new Response(
        JSON.stringify({
          message: 'Status updated successfully',
          notificationId: payload.notificationId,
          status: payload.status
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (req.method === 'GET') {
      // Get notification analytics
      const url = new URL(req.url)
      const userId = url.searchParams.get('userId')
      const startDate = url.searchParams.get('startDate')
      const endDate = url.searchParams.get('endDate')

      // Get analytics data
      const { data: analytics, error } = await supabaseClient.rpc('get_notification_analytics', {
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate || new Date().toISOString(),
        p_user_id: userId || null
      })

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({
          analytics: analytics || [],
          period: {
            start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: endDate || new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in notification-status function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})