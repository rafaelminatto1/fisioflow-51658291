// Edge Function para backup automatizado do banco de dados
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { captureException, captureMessage } from '../_shared/sentry.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configurações de backup
const BACKUP_RETENTION_DAYS = 30;
const BACKUP_STORAGE_BUCKET = 'database-backups';

interface BackupResult {
  success: boolean;
  backupId?: string;
  fileName?: string;
  size?: number;
  error?: string;
}

/**
 * Executa backup do banco de dados usando pg_dump
 */
async function performBackup(): Promise<BackupResult> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.sql`;
    
    // Obter connection string do banco
    const dbUrl = Deno.env.get('DATABASE_URL');
    if (!dbUrl) {
      throw new Error('DATABASE_URL não configurado');
    }

    // Executar pg_dump via Deno
    // Nota: Em produção, isso pode precisar ser executado em um ambiente diferente
    // ou usar uma função RPC do Supabase que executa pg_dump
    const backupCommand = new Deno.Command('pg_dump', {
      args: [
        dbUrl,
        '--no-owner',
        '--no-acl',
        '--clean',
        '--if-exists',
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await backupCommand.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`pg_dump falhou: ${errorText}`);
    }

    const backupData = new TextDecoder().decode(stdout);
    const backupSize = new Blob([backupData]).size;

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BACKUP_STORAGE_BUCKET)
      .upload(fileName, backupData, {
        contentType: 'application/sql',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload do backup: ${uploadError.message}`);
    }

    // Registrar backup no banco
    const { data: backupRecord, error: recordError } = await supabase
      .from('database_backups')
      .insert({
        file_name: fileName,
        file_path: uploadData.path,
        size_bytes: backupSize,
        status: 'completed',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (recordError) {
      console.warn('Erro ao registrar backup no banco:', recordError);
      // Não falhar o backup por causa disso
    }

    // Limpar backups antigos
    await cleanupOldBackups();

    return {
      success: true,
      backupId: backupRecord?.id,
      fileName,
      size: backupSize,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    captureException(error instanceof Error ? error : new Error(errorMessage));
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Remove backups mais antigos que o período de retenção
 */
async function cleanupOldBackups(): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

    // Buscar backups antigos
    const { data: oldBackups, error } = await supabase
      .from('database_backups')
      .select('id, file_path')
      .lt('created_at', cutoffDate.toISOString());

    if (error || !oldBackups) {
      console.error('Erro ao buscar backups antigos:', error);
      return;
    }

    // Deletar arquivos do storage
    for (const backup of oldBackups) {
      try {
        await supabase.storage
          .from(BACKUP_STORAGE_BUCKET)
          .remove([backup.file_path]);

        // Deletar registro do banco
        await supabase
          .from('database_backups')
          .delete()
          .eq('id', backup.id);

        console.log(`Backup antigo removido: ${backup.file_path}`);
      } catch (err) {
        console.error(`Erro ao remover backup ${backup.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Erro ao limpar backups antigos:', error);
  }
}

/**
 * Envia notificação de falha de backup
 */
async function notifyBackupFailure(error: string): Promise<void> {
  try {
    // Enviar email ou WhatsApp de notificação
    // Por enquanto, apenas log
    captureMessage(`Backup falhou: ${error}`, 'error');
    
    // TODO: Integrar com serviço de notificações
    // await sendNotification({
    //   type: 'backup_failed',
    //   message: `Backup do banco de dados falhou: ${error}`,
    //   severity: 'high',
    // });
  } catch (err) {
    console.error('Erro ao enviar notificação de falha:', err);
  }
}

serve(async (req: Request) => {
  // Verificar autenticação (apenas cron jobs ou admin)
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  
  if (!authHeader && !cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verificar se é uma chamada de cron
  const cronHeader = req.headers.get('X-Cron-Secret');
  if (cronHeader !== cronSecret) {
    // Tentar validar como usuário admin
    // TODO: Implementar validação de admin
    return new Response('Unauthorized', { status: 401 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  console.log('Iniciando backup do banco de dados...');
  const startTime = Date.now();

  const result = await performBackup();

  const duration = Date.now() - startTime;

  if (result.success) {
    console.log(`Backup concluído com sucesso em ${duration}ms`);
    captureMessage(
      `Backup concluído: ${result.fileName} (${(result.size! / 1024 / 1024).toFixed(2)} MB)`,
      'info'
    );

    return new Response(
      JSON.stringify({
        success: true,
        backupId: result.backupId,
        fileName: result.fileName,
        size: result.size,
        duration_ms: duration,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } else {
    console.error(`Backup falhou: ${result.error}`);
    await notifyBackupFailure(result.error || 'Erro desconhecido');

    return new Response(
      JSON.stringify({
        success: false,
        error: result.error,
        duration_ms: duration,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

