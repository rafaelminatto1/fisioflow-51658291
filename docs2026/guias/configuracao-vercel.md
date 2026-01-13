# Configuração Vercel Deploy

## 1. Conectar Repositório

1. Acesse [vercel.com](https://vercel.com)
2. **"Add New Project"**
3. Importe do GitHub

## 2. Configuração do Projeto

```
Framework Preset: Vite
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install --frozen-lockfile
```

## 3. Variáveis de Ambiente

Adicione em **Settings → Environment Variables**:

| Nome | Valor | Ambiente |
|------|-------|-----------|
| `VITE_SUPABASE_URL` | Sua URL Supabase | All |
| `VITE_SUPABASE_ANON_KEY` | Sua key | All |
| `VITE_SENTRY_DSN` | Seu DSN Sentry | All |

## 4. Deploy Automático

Toda vez que fizer push para `main`:

```bash
git push origin main
```

Deploy automático!

## 5. Custom Domain

**Settings → Domains**

Adicione:
- `app.fisioflow.com` (produção)
- `staging.fisioflow.com` (preview)

## 6. Edge Functions

Configurado em `vercel.json`:

```json
{
  "functions": {
    "api/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## 7. Cron Jobs

Já configurado em `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 8 * * *"
    }
  ]
}
```

## 8. Analytics

**Analytics** → Ativar para:
- Web Vitals
- Page views
- Geographic data

## 9. Performance

**Settings → General**

Configure:
- **Framework Preset**: Vite
- **Node.js Version**: 18.x

## 10. Security

**Settings → Git**

Ignorar variáveis sensíveis no `.gitignore`:

```gitignore
.env
.env.local
*.key
```

## 🔗 Recursos

- [Vercel Docs](https://vercel.com/docs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/projects/domains/add-a-domain)
