# Configuração de Backup Automatizado

## Configuração do Cron Job

Para configurar o backup diário, você precisa criar um cron job no Supabase que chama a Edge Function `backup-database`.

### Opção 1: Via Supabase Dashboard

1. Acesse o Supabase Dashboard
2. Vá em **Database** > **Cron Jobs**
3. Crie um novo cron job com:
   - **Schedule**: `0 3 * * *` (3:00 AM UTC diariamente)
   - **Function**: `backup-database`
   - **Headers**: 
     ```json
     {
       "X-Cron-Secret": "seu-secret-aqui"
     }
     ```

### Opção 2: Via SQL

```sql
-- Criar cron job para backup diário às 3:00 UTC
SELECT cron.schedule(
  'daily-database-backup',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ycvbtjfrchcyvmkvuocu.supabase.co/functions/v1/backup-database',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', 'seu-secret-aqui'
      )
    ) AS request_id;
  $$
);
```

## Variáveis de Ambiente Necessárias

Configure no Supabase Dashboard > Settings > Edge Functions:

- `CRON_SECRET`: Secret para autenticar chamadas de cron
- `DATABASE_URL`: Connection string do PostgreSQL (formato: `postgresql://user:pass@host:port/db`)
- `UPSTASH_REDIS_REST_URL`: (Opcional) URL do Upstash Redis
- `UPSTASH_REDIS_REST_TOKEN`: (Opcional) Token do Upstash Redis

## Storage Bucket

Crie um bucket no Supabase Storage chamado `database-backups`:

```sql
-- Via SQL (se disponível) ou via Dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('database-backups', 'database-backups', false);
```

## Retenção

Por padrão, backups são mantidos por 30 dias. Para alterar, modifique `BACKUP_RETENTION_DAYS` em `backup-database/index.ts`.

