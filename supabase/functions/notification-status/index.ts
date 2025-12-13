import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function validateStatusPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload inválido' }
  }
  
  if (!payload.notificationId || typeof payload.notificationId !== 'string') {
    return { valid: false, error: 'notificationId é obrigatório' }
  }
  
  if (!isValidUUID(payload.notificationId)) {
    return { valid: false, error: 'notificationId deve ser um UUID válido' }
  }
  
  const validStatuses = ['delivered', 'clicked', 'failed']
  if (!payload.status || !validStatuses.includes(payload.status)) {
    return { valid: false, error: 'status deve ser delivered, clicked ou failed' }
  }
  
  if (payload.errorMessage && (typeof payload.errorMessage !== 'string' || payload.errorMessage.length > 500)) {
    return { valid: false, error: 'errorMessage deve ter no máximo 500 caracteres' }
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

    if (req.method === 'POST') {
      // Parse and validate payload
      let payload
      try {
        payload = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ error: 'Corpo da requisição inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validation = validateStatusPayload(payload)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update notification status in database
      const { data, error } = await supabaseClient.rpc('update_notification_status', {
        p_notification_id: payload.notificationId,
        p_status: payload.status,
        p_error_message: payload.errorMessage || null
      })

      if (error) {
        console.error('[notification-status] Database error:', {
          requestId,
          error,
          timestamp: new Date().toISOString()
        })
        return safeErrorResponse(requestId)
      }

      console.log(`[notification-status] Status updated: ${payload.notificationId} -> ${payload.status}`)

      return new Response(
        JSON.stringify({
          message: 'Status atualizado com sucesso',
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

      // Validate userId if provided
      if (userId && !isValidUUID(userId)) {
        return new Response(
          JSON.stringify({ error: 'userId deve ser um UUID válido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get analytics data
      const { data: analytics, error } = await supabaseClient.rpc('get_notification_analytics', {
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate || new Date().toISOString(),
        p_user_id: userId || null
      })

      if (error) {
        console.error('[notification-status] Analytics error:', {
          requestId,
          error,
          timestamp: new Date().toISOString()
        })
        return safeErrorResponse(requestId)
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
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('[notification-status] Unexpected error:', {
      requestId,
      error,
      timestamp: new Date().toISOString()
    })
    
    return safeErrorResponse(requestId)
  }
})
