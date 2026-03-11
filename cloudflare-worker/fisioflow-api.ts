/**
 * FisioFlow API Worker - Cloudflare Workers
 * Handles: Notifications, Financial Metrics, and more
 * Connects to: Neon DB (PostgreSQL)
 */

export interface Env {
  DATABASE_URL: string;
  AUTH_TOKEN: string;
  JWT_SECRET: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

interface FinancialMetrics {
  totalRevenue: number;
  pendingRevenue: number;
  paidRevenue: number;
  sessionsCount: number;
  patientsCount: number;
  newPatientsThisMonth: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Simple Neon DB query helper using fetch
async function queryNeon(sql: string, params: any[] = [], databaseUrl: string): Promise<any[]> {
  // Neon HTTP API
  const response = await fetch(databaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql,
      params: params.length > 0 ? params : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Neon DB error: ${error}`);
  }

  const data = await response.json();
  return data.results || [];
}

// Verify JWT token (simplified - in production use proper JWT library)
function verifyToken(authHeader: string | null, jwtSecret: string): { userId: string; orgId: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  // In production, verify JWT properly
  // For now, we'll trust the token format
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return { userId: payload.sub || payload.userId, orgId: payload.orgId };
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // =====================
      // HEALTH CHECK
      // =====================
      if (path === '/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          service: 'fisioflow-api',
          timestamp: new Date().toISOString()
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // =====================
      // NOTIFICATIONS API
      // =====================
      
      // GET /notifications - List user notifications
      if (path === '/api/notifications' && request.method === 'GET') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const unreadOnly = url.searchParams.get('unread') === 'true';

        const sql = `
          SELECT id, user_id, type, title, message, link, is_read, metadata, created_at
          FROM notifications
          WHERE user_id = $1 ${unreadOnly ? 'AND is_read = false' : ''}
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `;

        const notifications = await queryNeon(sql, [user.userId, limit, offset], env.DATABASE_URL);
        
        // Get unread count
        const countSql = `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`;
        const countResult = await queryNeon(countSql, [user.userId], env.DATABASE_URL);
        const unreadCount = countResult[0]?.count || 0;

        return new Response(JSON.stringify({ 
          notifications, 
          unreadCount,
          total: notifications.length 
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // POST /notifications - Create notification
      if (path === '/api/notifications' && request.method === 'POST') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const body = await request.json() as Partial<Notification>;
        
        const sql = `
          INSERT INTO notifications (user_id, type, title, message, link, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const result = await queryNeon(sql, [
          body.user_id || user.userId,
          body.type || 'info',
          body.title,
          body.message,
          body.link || null,
          body.metadata || {}
        ], env.DATABASE_URL);

        // TODO: Send push notification via Expo Push API
        // This would fetch the user's push_tokens and send to Expo

        return new Response(JSON.stringify(result[0]), { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // PUT /notifications/:id/read - Mark as read
      if (path.match(/^\/api\/notifications\/[\w-]+\/read$/) && request.method === 'PUT') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const notificationId = path.split('/')[3];
        
        const sql = `
          UPDATE notifications 
          SET is_read = true 
          WHERE id = $1 AND user_id = $2
          RETURNING *
        `;

        const result = await queryNeon(sql, [notificationId, user.userId], env.DATABASE_URL);

        if (result.length === 0) {
          return new Response(JSON.stringify({ error: 'Not found' }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        return new Response(JSON.stringify(result[0]), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // PUT /notifications/read-all - Mark all as read
      if (path === '/api/notifications/read-all' && request.method === 'PUT') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const sql = `
          UPDATE notifications 
          SET is_read = true 
          WHERE user_id = $1 AND is_read = false
        `;

        await queryNeon(sql, [user.userId], env.DATABASE_URL);

        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // DELETE /notifications/:id - Delete notification
      if (path.match(/^\/api\/notifications\/[\w-]+$/) && request.method === 'DELETE') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const notificationId = path.split('/')[3];
        
        const sql = `DELETE FROM notifications WHERE id = $1 AND user_id = $2`;
        await queryNeon(sql, [notificationId, user.userId], env.DATABASE_URL);

        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // =====================
      // FINANCIAL METRICS API
      // =====================
      
      if (path === '/api/financial-metrics' && request.method === 'GET') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const startDate = url.searchParams.get('startDate') || new Date(new Date().setDate(1)).toISOString().split('T')[0];
        const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

        // Total revenue (paid appointments)
        const revenueSql = `
          SELECT COALESCE(SUM(payment_amount), 0) as total
          FROM appointments
          WHERE organization_id IS NOT NULL
            AND payment_status = 'paid'
            AND date >= $1
            AND date <= $2
        `;
        const revenueResult = await queryNeon(revenueSql, [startDate, endDate], env.DATABASE_URL);
        const totalRevenue = parseFloat(revenueResult[0]?.total || '0');

        // Pending revenue
        const pendingSql = `
          SELECT COALESCE(SUM(payment_amount), 0) as total
          FROM appointments
          WHERE organization_id IS NOT NULL
            AND payment_status = 'pending'
            AND date >= $1
            AND date <= $2
        `;
        const pendingResult = await queryNeon(pendingSql, [startDate, endDate], env.DATABASE_URL);
        const pendingRevenue = parseFloat(pendingResult[0]?.total || '0');

        // Sessions count
        const sessionsSql = `
          SELECT COUNT(*) as count
          FROM appointments
          WHERE organization_id IS NOT NULL
            AND status IN ('completed', 'confirmed')
            AND date >= $1
            AND date <= $2
        `;
        const sessionsResult = await queryNeon(sessionsSql, [startDate, endDate], env.DATABASE_URL);
        const sessionsCount = parseInt(sessionsResult[0]?.count || '0');

        // Active patients count
        const patientsSql = `
          SELECT COUNT(*) as count
          FROM patients
          WHERE is_active = true AND archived = false
        `;
        const patientsResult = await queryNeon(patientsSql, [], env.DATABASE_URL);
        const patientsCount = parseInt(patientsResult[0]?.count || '0');

        // New patients this month
        const newPatientsSql = `
          SELECT COUNT(*) as count
          FROM patients
          WHERE is_active = true
            AND created_at >= $1
            AND created_at <= $2
        `;
        const newPatientsResult = await queryNeon(newPatientsSql, [startDate, endDate], env.DATABASE_URL);
        const newPatientsThisMonth = parseInt(newPatientsResult[0]?.count || '0');

        // Revenue by day (for charts)
        const revenueByDaySql = `
          SELECT date, COALESCE(SUM(payment_amount), 0) as total
          FROM appointments
          WHERE payment_status = 'paid'
            AND date >= $1
            AND date <= $2
          GROUP BY date
          ORDER BY date
        `;
        const revenueByDay = await queryNeon(revenueByDaySql, [startDate, endDate], env.DATABASE_URL);

        const metrics: FinancialMetrics = {
          totalRevenue,
          pendingRevenue,
          paidRevenue: totalRevenue,
          sessionsCount,
          patientsCount,
          newPatientsThisMonth,
          revenueByDay,
        };

        return new Response(JSON.stringify(metrics), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // =====================
      // PUSH TOKENS API
      // =====================
      
      // POST /api/push-tokens - Register push token
      if (path === '/api/push-tokens' && request.method === 'POST') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const body = await request.json() as { expo_push_token: string; device_name?: string; device_type?: string };
        
        const sql = `
          INSERT INTO push_tokens (user_id, expo_push_token, device_name, device_type)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (expo_push_token) 
          DO UPDATE SET is_active = true, updated_at = NOW()
          RETURNING *
        `;

        const result = await queryNeon(sql, [
          user.userId,
          body.expo_push_token,
          body.device_name || 'Unknown',
          body.device_type || 'mobile'
        ], env.DATABASE_URL);

        return new Response(JSON.stringify(result[0]), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // 404 for unmatched routes
      return new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });

    } catch (error) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error', 
        message: String(error) 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }
};