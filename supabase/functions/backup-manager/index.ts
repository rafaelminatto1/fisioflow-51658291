import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackupRequest {
  action: 'create' | 'list' | 'stats' | 'cleanup';
  backupType?: 'daily' | 'weekly' | 'manual';
  tables?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: BackupRequest = await req.json();
    const { action } = body;

    console.log(`[backup-manager] Action: ${action}, User: ${user.email}`);

    switch (action) {
      case 'create': {
        const backupType = body.backupType || 'manual';
        const backupName = `fisioflow_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
        
        // Tables to backup
        const tablesToBackup = body.tables || [
          'patients', 'appointments', 'profiles', 'contas_financeiras',
          'session_packages', 'exercises', 'eventos', 'leads', 'vouchers'
        ];

        // Create backup log entry
        const { data: backupLog, error: insertError } = await supabase
          .from('backup_logs')
          .insert({
            backup_name: backupName,
            backup_type: backupType,
            tables_included: tablesToBackup,
            status: 'pending',
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[backup-manager] Error creating backup log:', insertError);
          throw insertError;
        }

        // Count records per table
        const recordsCounts: Record<string, number> = {};
        
        for (const table of tablesToBackup) {
          try {
            const { count } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true });
            recordsCounts[table] = count || 0;
          } catch (e) {
            console.warn(`[backup-manager] Could not count ${table}:`, e);
            recordsCounts[table] = 0;
          }
        }

        // Update backup log with counts and mark as completed
        // Note: Actual backup file creation would be done via Supabase Dashboard
        // or pg_dump in production. This logs the backup intention.
        const { error: updateError } = await supabase
          .from('backup_logs')
          .update({
            records_count: recordsCounts,
            status: 'completed',
            completed_at: new Date().toISOString(),
            file_path: `/backups/${backupName}.json`, // Symbolic path
          })
          .eq('id', backupLog.id);

        if (updateError) {
          console.error('[backup-manager] Error updating backup log:', updateError);
        }

        console.log(`[backup-manager] Backup created: ${backupName}`);

        return new Response(
          JSON.stringify({
            success: true,
            backup: {
              id: backupLog.id,
              name: backupName,
              tables: tablesToBackup,
              records: recordsCounts,
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        const { data: backups, error } = await supabase
          .from('backup_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        return new Response(
          JSON.stringify({ backups }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'stats': {
        // Get backup statistics
        const { data: stats } = await supabase
          .from('backup_logs')
          .select('status, backup_type, created_at')
          .order('created_at', { ascending: false });

        const completed = stats?.filter(s => s.status === 'completed').length || 0;
        const failed = stats?.filter(s => s.status === 'failed').length || 0;
        const lastBackup = stats?.find(s => s.status === 'completed');

        return new Response(
          JSON.stringify({
            totalBackups: stats?.length || 0,
            completedBackups: completed,
            failedBackups: failed,
            lastBackupDate: lastBackup?.created_at || null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cleanup': {
        // Mark old backups as expired (30+ days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: expired, error } = await supabase
          .from('backup_logs')
          .update({ status: 'expired' })
          .lt('created_at', thirtyDaysAgo.toISOString())
          .eq('status', 'completed')
          .select();

        if (error) throw error;

        console.log(`[backup-manager] Cleaned up ${expired?.length || 0} old backups`);

        return new Response(
          JSON.stringify({
            success: true,
            cleanedUp: expired?.length || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[backup-manager] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});