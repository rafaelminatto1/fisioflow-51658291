# Configuração Completa do Supabase

## 1. Criar Projeto

1. Acesse [supabase.com](https://supabase.com)
2. Clique em **"New Project"**
3. Configure:
   - **Name**: `fisioflow-prod`
   - **Database Password**: (salve em local seguro!)
   - **Region**: South America (São Paulo)
   - **Pricing Plan**: Pro

## 2. Configurar Database URL

Copie as credenciais em **Settings → API**:

```env
# .env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Executar Migrations

### Via Dashboard

1. Vá em **SQL Editor**
2. Execute cada migration em ordem cronológica:
   - Começando por `20240101000001_initial_schema.sql`
   - Terminando em `20260113220000_seed_evaluation_templates.sql`

### Via CLI

```bash
# Instalar CLI
npm install -g supabase

# Linkar ao projeto
supabase link --project-ref seu-project-id

# Push migrations
supabase db push
```

## 4. Configurar RLS Policies

As migrations já incluem as policies. Verifique em:

**Authentication → Policies**

Todas as tabelas devem ter:
- ✅ RLS enabled
- ✅ Policies configuradas

## 5. Configurar Storage

### Criar Buckets

No **Storage** do Supabase:

```sql
-- Criar buckets
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('avatars', 'avatars', true),
  ('exercise-videos', 'exercise-videos', true),
  ('medical-images', 'medical-images', false);

-- Configurar policies
-- (já incluído nas migrations)
```

## 6. Configurar Email

### Supabase Email (Grátis)

**Settings → Authentication → Email Templates**

Customize os templates de:
- Confirm signup
- Reset password
- Email change

### SendGrid (Recomendado)

```bash
# Instalar SDK
pnpm add @sendgrid/mail
```

```env
# .env
VITE_SENDGRID_API_KEY=SG.xxx
```

## 7. Configurar Webhooks

**Settings → Database → Webhooks**

Adicione URLs para:
- Stripe (pagamentos)
- Twilio (WhatsApp)
- Custom webhooks

## 8. Backup Automático (Pro)

**Settings → Database → Backups**

Configurado automaticamente:
- **Daily backups**: 3AM UTC
- **Retention**: 30 dias
- **Point-in-time Recovery**: 7 dias

## 9. Monitoring

**Logs → Database**

Monitore:
- Slow queries
- Errors
- Blocking transactions

## 10. Segurança

### Rotacionar Keys

**Settings → API → Rotate**

Rotação periódica:
- Anon key: 6 meses
- Service role key: 1 ano

### Database Password

**Settings → Database → Password**

Trocar a cada 3 meses.

## 🔗 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [Guia RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)
