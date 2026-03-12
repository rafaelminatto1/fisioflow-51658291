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

      // =====================
      // USER PROFILE API
      // =====================
      
      // GET /api/users/:id - Get user profile
      if (path.match(/^\/api\/users\/[\w-]+$/) && request.method === 'GET') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const userId = path.split('/')[3];
        
        const sql = `
          SELECT id, name, email, specialty, license_number as "licenseNumber", 
                 phone, avatar_url as "avatarUrl", created_at, updated_at
          FROM users
          WHERE id = $1
        `;
        
        const result = await queryNeon(sql, [userId], env.DATABASE_URL);

        if (result.length === 0) {
          return new Response(JSON.stringify({ error: 'User not found' }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        return new Response(JSON.stringify(result[0]), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // PUT /api/users/:id - Update user profile
      if (path.match(/^\/api\/users\/[\w-]+$/) && request.method === 'PUT') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const userId = path.split('/')[3];
        const body = await request.json() as Record<string, any>;
        
        // Build dynamic update query
        const allowedFields = ['name', 'email', 'specialty', 'license_number', 'phone', 'avatar_url', 'clinic_name', 'clinic_address', 'clinic_phone'];
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(body)) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase to snake_case
          if (allowedFields.includes(dbKey)) {
            updates.push(`${dbKey} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        }

        if (updates.length === 0) {
          return new Response(JSON.stringify({ error: 'No valid fields to update' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        updates.push(`updated_at = NOW()`);
        values.push(userId);

        const sql = `
          UPDATE users 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, name, email, specialty, license_number as "licenseNumber", 
                     phone, avatar_url as "avatarUrl", created_at, updated_at
        `;

        const result = await queryNeon(sql, values, env.DATABASE_URL);

        return new Response(JSON.stringify(result[0]), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // =====================
      // NOTIFICATION SETTINGS API
      // =====================
      
      // GET /api/settings/notifications/:userId
      if (path.match(/^\/api\/settings\/notifications\/[\w-]+$/) && request.method === 'GET') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const userId = path.split('/')[4];
        
        const sql = `
          SELECT user_id as "userId", category, enabled, quiet_hours_enabled as "quietHoursEnabled",
                 quiet_hours_start as "quietHoursStart", quiet_hours_end as "quietHoursEnd",
                 channels, updated_at as "updatedAt"
          FROM notification_settings
          WHERE user_id = $1
        `;
        
        const result = await queryNeon(sql, [userId], env.DATABASE_URL);
        
        // Transform to object format expected by frontend
        const settings: Record<string, any> = {
          userId,
          appointments: null,
          patients: null,
          system: null,
          marketing: null,
        };

        for (const row of result) {
          settings[row.category] = {
            userId: row.userId,
            category: row.category,
            enabled: row.enabled,
            quietHoursEnabled: row.quietHoursEnabled,
            quietHoursStart: row.quietHoursStart,
            quietHoursEnd: row.quietHoursEnd,
            channels: row.channels,
            updatedAt: row.updatedAt,
          };
        }

        return new Response(JSON.stringify(settings), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // PUT /api/settings/notifications/:userId
      if (path.match(/^\/api\/settings\/notifications\/[\w-]+$/) && request.method === 'PUT') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const userId = path.split('/')[4];
        const body = await request.json() as Record<string, any>;
        
        // Upsert each category
        const categories = ['appointments', 'patients', 'system', 'marketing'];
        
        for (const category of categories) {
          if (body[category]) {
            const pref = body[category];
            const sql = `
              INSERT INTO notification_settings 
                (user_id, category, enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, channels)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (user_id, category)
              DO UPDATE SET
                enabled = EXCLUDED.enabled,
                quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
                quiet_hours_start = EXCLUDED.quiet_hours_start,
                quiet_hours_end = EXCLUDED.quiet_hours_end,
                channels = EXCLUDED.channels,
                updated_at = NOW()
            `;
            await queryNeon(sql, [
              userId,
              category,
              pref.enabled ?? true,
              pref.quietHoursEnabled ?? false,
              pref.quietHoursStart || '22:00',
              pref.quietHoursEnd || '08:00',
              pref.channels || { push: true, email: true, inApp: true }
            ], env.DATABASE_URL);
          }
        }

        return new Response(JSON.stringify({ success: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // =====================
      // AI SUGGESTIONS API
      // =====================
      
      // POST /api/ai/exercise-suggestions
      if (path === '/api/ai/exercise-suggestions' && request.method === 'POST') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const body = await request.json() as {
          patientId: string;
          conditions: any[];
          recentEvolutions: any[];
          painLevel: number;
        };
        
        // Generate AI-powered suggestions
        // In production, this would call an AI service like OpenAI or similar
        const suggestions = await generateAIExerciseSuggestions(body);
        
        return new Response(JSON.stringify(suggestions), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // GET /api/ai/patient-insights/:patientId
      if (path.match(/^\/api\/ai\/patient-insights\/[\w-]+$/) && request.method === 'GET') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const patientId = path.split('/')[4];
        
        // Get patient data from DB
        const patientSql = `
          SELECT p.*, 
                 COUNT(DISTINCT e.id) as evolution_count,
                 AVG(e.pain_level) as avg_pain,
                 MAX(e.created_at) as last_evolution
          FROM patients p
          LEFT JOIN evolutions e ON e.patient_id = p.id
          WHERE p.id = $1
          GROUP BY p.id
        `;
        const patientData = await queryNeon(patientSql, [patientId], env.DATABASE_URL);
        
        if (patientData.length === 0) {
          return new Response(JSON.stringify({ error: 'Patient not found' }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        // Generate insights
        const insights = generatePatientInsights(patientData[0]);
        
        return new Response(JSON.stringify(insights), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // =====================
      // AUTH API (Password Change)
      // =====================
      
      // POST /api/auth/change-password
      if (path === '/api/auth/change-password' && request.method === 'POST') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const body = await request.json() as { currentPassword: string; newPassword: string };
        
        // In production, verify current password against Neon Auth
        // For now, we'll just update the password hash
        
        // TODO: Integrate with Neon Auth password change API
        // This is a placeholder - real implementation needs Neon Auth integration
        
        // Simulate success for now
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Password changed successfully' 
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // =====================
      // DATA EXPORT API
      // =====================
      
      // POST /api/export - Request data export
      if (path === '/api/export' && request.method === 'POST') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const body = await request.json() as {
          userId: string;
          format: 'json' | 'pdf' | 'csv';
          types: string[];
          dateRange?: { start: string; end: string };
        };

        // In production, this would:
        // 1. Create a job in a queue
        // 2. Process the export asynchronously
        // 3. Upload to cloud storage
        // 4. Send notification with download link

        // For now, return a simulated response
        const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Log the export request (audit)
        const auditSql = `
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
          VALUES ($1, 'data_export', 'user', $2, $3)
        `;
        await queryNeon(auditSql, [
          user.userId,
          exportId,
          JSON.stringify({
            format: body.format,
            types: body.types,
            requestedAt: new Date().toISOString()
          })
        ], env.DATABASE_URL);

        return new Response(JSON.stringify({
          status: 'processing',
          exportId,
          message: 'Export request received. Processing may take up to 48 hours.',
          estimatedCompletion: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        }), { 
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // GET /api/export/:exportId - Check export status
      if (path.match(/^\/api\/export\/[\w-]+$/) && request.method === 'GET') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const exportId = path.split('/')[3];

        // In production, check actual job status
        // For demo, return completed status with mock data
        
        return new Response(JSON.stringify({
          exportId,
          status: 'completed',
          downloadUrl: `https://storage.example.com/exports/${exportId}.json`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          fileSize: '2.4 MB'
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // POST /api/export/patients - Export patient data
      if (path === '/api/export/patients' && request.method === 'POST') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const body = await request.json() as {
          patientIds?: string[];
          format: 'json' | 'csv';
          includeEvolutions: boolean;
          includeAppointments: boolean;
        };

        // Fetch patient data
        let patientSql = `
          SELECT id, name, email, phone, birth_date, gender, 
                 address, created_at, updated_at
          FROM patients
          WHERE is_active = true
        `;
        const params: any[] = [];
        
        if (body.patientIds && body.patientIds.length > 0) {
          patientSql += ` AND id = ANY($1)`;
          params.push(body.patientIds);
        }

        const patients = await queryNeon(patientSql, params, env.DATABASE_URL);

        if (body.format === 'csv') {
          // Generate CSV
          const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Data Nascimento', 'Gênero', 'Criado em'];
          const rows = patients.map((p: any) => [
            p.id,
            p.name,
            p.email || '',
            p.phone || '',
            p.birth_date || '',
            p.gender || '',
            p.created_at
          ]);
          
          const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
          
          return new Response(csv, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="patients-export.csv"'
            }
          });
        }

        // Return JSON
        return new Response(JSON.stringify({
          exportedAt: new Date().toISOString(),
          totalRecords: patients.length,
          data: patients
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // POST /api/export/evolutions - Export evolution notes
      if (path === '/api/export/evolutions' && request.method === 'POST') {
        const user = verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
        if (!user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const body = await request.json() as {
          patientId?: string;
          startDate?: string;
          endDate?: string;
          format: 'json' | 'csv';
        };

        let evolutionSql = `
          SELECT e.id, e.patient_id, e.professional_id, e.session_date,
                 e.subjective, e.objective, e.assessment, e.plan,
                 e.pain_level, e.mobility_score, e.notes, e.created_at,
                 p.name as patient_name
          FROM evolutions e
          JOIN patients p ON p.id = e.patient_id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (body.patientId) {
          evolutionSql += ` AND e.patient_id = $${params.length + 1}`;
          params.push(body.patientId);
        }
        if (body.startDate) {
          evolutionSql += ` AND e.session_date >= $${params.length + 1}`;
          params.push(body.startDate);
        }
        if (body.endDate) {
          evolutionSql += ` AND e.session_date <= $${params.length + 1}`;
          params.push(body.endDate);
        }

        evolutionSql += ` ORDER BY e.session_date DESC`;

        const evolutions = await queryNeon(evolutionSql, params, env.DATABASE_URL);

        if (body.format === 'csv') {
          const headers = ['ID', 'Paciente', 'Data', 'Subjetivo', 'Objetivo', 'Avaliação', 'Plano', 'Dor', 'Mobilidade'];
          const rows = evolutions.map((e: any) => [
            e.id,
            `"${(e.patient_name || '').replace(/"/g, '""')}"`,
            e.session_date,
            `"${(e.subjective || '').replace(/"/g, '""')}"`,
            `"${(e.objective || '').replace(/"/g, '""')}"`,
            `"${(e.assessment || '').replace(/"/g, '""')}"`,
            `"${(e.plan || '').replace(/"/g, '""')}"`,
            e.pain_level || '',
            e.mobility_score || ''
          ]);
          
          const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
          
          return new Response(csv, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="evolutions-export.csv"'
            }
          });
        }

        return new Response(JSON.stringify({
          exportedAt: new Date().toISOString(),
          totalRecords: evolutions.length,
          data: evolutions
        }), { 
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

// =====================
// AI HELPER FUNCTIONS
// =====================

interface ExerciseSuggestion {
  exerciseId: string;
  exerciseName: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  targetArea: string;
  estimatedDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  contraindications: string[];
  benefits: string[];
  progressMetrics: {
    previousScore?: number;
    targetScore: number;
    improvement: number;
  };
}

async function generateAIExerciseSuggestions(context: {
  patientId: string;
  conditions: any[];
  recentEvolutions: any[];
  painLevel: number;
}): Promise<ExerciseSuggestion[]> {
  const suggestions: ExerciseSuggestion[] = [];
  
  // Exercise database based on body parts
  const exerciseDatabase: Record<string, ExerciseSuggestion[]> = {
    'lumbar': [
      {
        exerciseId: 'cat-cow',
        exerciseName: 'Cat-Cow Stretch',
        reason: 'Melhora a mobilidade da coluna lombar',
        priority: 'high',
        targetArea: 'Lombar',
        estimatedDuration: 5,
        difficulty: 'easy',
        contraindications: ['Hérnia discal aguda'],
        benefits: ['Mobilidade', 'Flexibilidade', 'Alívio da dor'],
        progressMetrics: { targetScore: 80, improvement: 10 }
      },
      {
        exerciseId: 'bird-dog',
        exerciseName: 'Bird Dog',
        reason: 'Fortalece o core e estabiliza a coluna',
        priority: 'high',
        targetArea: 'Core/Lombar',
        estimatedDuration: 8,
        difficulty: 'medium',
        contraindications: [],
        benefits: ['Estabilidade', 'Força', 'Coordenação'],
        progressMetrics: { targetScore: 75, improvement: 15 }
      },
      {
        exerciseId: 'glute-bridge',
        exerciseName: 'Ponte de Glúteos',
        reason: 'Ativa glúteos e estabiliza a pelve',
        priority: 'medium',
        targetArea: 'Glúteos/Lombar',
        estimatedDuration: 6,
        difficulty: 'easy',
        contraindications: [],
        benefits: ['Força', 'Estabilização'],
        progressMetrics: { targetScore: 80, improvement: 12 }
      }
    ],
    'joelho': [
      {
        exerciseId: 'quad-stretch',
        exerciseName: 'Alongamento de Quadríceps',
        reason: 'Aumenta a flexibilidade do quadríceps',
        priority: 'medium',
        targetArea: 'Joelho/Quadríceps',
        estimatedDuration: 5,
        difficulty: 'easy',
        contraindications: ['Lesão aguda de LCA'],
        benefits: ['Flexibilidade', 'Mobilidade'],
        progressMetrics: { targetScore: 85, improvement: 10 }
      },
      {
        exerciseId: 'wall-sit',
        exerciseName: 'Sentar na Parede',
        reason: 'Fortalece quadríceps isometricamente',
        priority: 'high',
        targetArea: 'Joelho/Quadríceps',
        estimatedDuration: 6,
        difficulty: 'medium',
        contraindications: ['Condromalácia grave'],
        benefits: ['Força', 'Resistência', 'Estabilidade'],
        progressMetrics: { targetScore: 70, improvement: 12 }
      },
      {
        exerciseId: 'terminal-knee-extension',
        exerciseName: 'Extensão Terminal de Joelho',
        reason: 'Fortalece o músculo vasto medial',
        priority: 'high',
        targetArea: 'Joelho',
        estimatedDuration: 8,
        difficulty: 'easy',
        contraindications: [],
        benefits: ['Força', 'Estabilidade patelar'],
        progressMetrics: { targetScore: 85, improvement: 15 }
      }
    ],
    'ombro': [
      {
        exerciseId: 'pendular-codman',
        exerciseName: 'Exercício Pendular de Codman',
        reason: 'Mobilização passiva do ombro',
        priority: 'high',
        targetArea: 'Ombro',
        estimatedDuration: 5,
        difficulty: 'easy',
        contraindications: [],
        benefits: ['Mobilidade', 'Relaxamento'],
        progressMetrics: { targetScore: 80, improvement: 15 }
      },
      {
        exerciseId: 'rotator-cuff',
        exerciseName: 'Fortalecimento do Manguito',
        reason: 'Estabiliza a articulação do ombro',
        priority: 'medium',
        targetArea: 'Ombro/Manguito',
        estimatedDuration: 10,
        difficulty: 'medium',
        contraindications: ['Ruptura completa'],
        benefits: ['Força', 'Estabilidade'],
        progressMetrics: { targetScore: 75, improvement: 10 }
      }
    ],
    'cervical': [
      {
        exerciseId: 'chin-tuck',
        exerciseName: 'Retração Cervical (Chin Tuck)',
        reason: 'Corrige a postura da cabeça e pescoço',
        priority: 'high',
        targetArea: 'Cervical',
        estimatedDuration: 5,
        difficulty: 'easy',
        contraindications: [],
        benefits: ['Postura', 'Alívio da dor', 'Fortalecimento'],
        progressMetrics: { targetScore: 85, improvement: 12 }
      },
      {
        exerciseId: 'cervical-rotation',
        exerciseName: 'Rotação Cervical Ativa',
        reason: 'Melhora a mobilidade cervical',
        priority: 'medium',
        targetArea: 'Cervical',
        estimatedDuration: 4,
        difficulty: 'easy',
        contraindications: [],
        benefits: ['Mobilidade', 'Flexibilidade'],
        progressMetrics: { targetScore: 80, improvement: 10 }
      }
    ]
  };

  // Process conditions and find matching exercises
  for (const condition of context.conditions) {
    const bodyPart = (condition.bodyPart || condition.body_part || 'geral').toLowerCase();
    
    if (exerciseDatabase[bodyPart]) {
      for (const exercise of exerciseDatabase[bodyPart]) {
        // Check contraindications
        const hasContraindication = exercise.contraindications.some(c => 
          context.conditions.some(cond => 
            (cond.name || cond.condition || '').toLowerCase().includes(c.toLowerCase())
          )
        );
        
        if (!hasContraindication) {
          // Adjust priority based on pain level
          let adjustedPriority = exercise.priority;
          if (context.painLevel > 7) {
            adjustedPriority = exercise.priority === 'high' ? 'medium' : 'low';
          }
          
          // Adjust difficulty based on pain
          let adjustedDifficulty = exercise.difficulty;
          if (context.painLevel > 7) {
            adjustedDifficulty = 'easy';
          }
          
          suggestions.push({
            ...exercise,
            priority: adjustedPriority as 'high' | 'medium' | 'low',
            difficulty: adjustedDifficulty as 'easy' | 'medium' | 'hard',
          });
        }
      }
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Remove duplicates and return top 5
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) =>
    index === self.findIndex(s => s.exerciseId === suggestion.exerciseId)
  );

  return uniqueSuggestions.slice(0, 5);
}

function generatePatientInsights(patientData: any): {
  insights: string[];
  recommendations: string[];
  riskFactors: string[];
  progressSummary: {
    trend: 'improving' | 'stable' | 'declining';
    sessionsCompleted: number;
    averagePain: number;
  };
} {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const riskFactors: string[] = [];

  const avgPain = parseFloat(patientData.avg_pain) || 0;
  const evolutionCount = parseInt(patientData.evolution_count) || 0;

  // Generate insights based on data
  if (evolutionCount === 0) {
    insights.push('Paciente sem evoluções registradas. Inicie o acompanhamento.');
    recommendations.push('Realizar avaliação inicial completa.');
  } else if (evolutionCount < 3) {
    insights.push('Paciente em fase inicial de tratamento.');
    recommendations.push('Manter frequência regular de sessões.');
  } else if (evolutionCount > 10) {
    insights.push('Paciente com bom engajamento no tratamento.');
    recommendations.push('Considerar progressão de exercícios.');
  }

  // Pain-based insights
  if (avgPain > 7) {
    insights.push('Nível de dor elevado detectado.');
    riskFactors.push('Dor crônica pode afetar qualidade de vida.');
    recommendations.push('Priorizar manejo da dor antes de exercícios intensos.');
  } else if (avgPain < 3) {
    insights.push('Nível de dor controlado.');
    recommendations.push('Foco em fortalecimento e prevenção.');
  }

  // Determine trend (simplified)
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (avgPain < 4 && evolutionCount > 5) {
    trend = 'improving';
  } else if (avgPain > 6) {
    trend = 'declining';
  }

  return {
    insights,
    recommendations,
    riskFactors,
    progressSummary: {
      trend,
      sessionsCompleted: evolutionCount,
      averagePain: Math.round(avgPain * 10) / 10,
    },
  };
}
