# 🏥 FisioFlow - Gestão Inteligente para Fisioterapia

Plataforma de alta performance para clínicas de fisioterapia, utilizando a stack mais moderna de 2026: **Neon DB + Cloudflare Workers**.

No mobile, o canal principal é o app nativo iOS/Android. A camada PWA da web fica como fallback para uso em navegador mobile, não como substituta dos apps nativos.

## 🛠 Stack Tecnológica

- **Frontend**: React 19, Tailwind CSS, shadcn/ui.
- **Backend**: Cloudflare Workers (TypeScript).
- **Banco de Dados**: Neon PostgreSQL (Serverless).
- **Autenticação**: Neon Auth (Powered by Better Auth).
- **Storage**: Cloudflare R2 (S3-Compatible).
- **ORM**: Drizzle ORM.

## 🚀 Configuração de Desenvolvimento

### 1. Requisitos
- Node.js 20+
- Cloudflare Wrangler CLI (`npm install -g wrangler`)
- Conta no Neon.tech

### 2. Variáveis de Ambiente
Crie um arquivo `.dev.vars` (para Workers) e `.env` (para Frontend):

```env
# Database
DATABASE_URL=postgresql://user:pass@ep-project.sa-east-1.aws.neon.tech/neondb?sslmode=require

# Auth
VITE_NEON_AUTH_URL=https://your-auth-endpoint.neonauth.aws.neon.tech
NEON_AUTH_JWKS_URL=...

# Storage (R2)
R2_BUCKET_NAME=fisioflow-media
```

Em Cloudflare Pages, configure `VITE_NEON_AUTH_URL` em `Production` e `Preview`. O frontend tem um fallback de producao para evitar `POST /api/auth/... -> 405`, mas a env continua sendo a configuracao canonica.

### 3. Scripts Principais

```bash
# Iniciar frontend
npm run dev

# Iniciar backend local (Wrangler)
cd apps/api && npm run dev

# Migrações de Banco de Dados
npx drizzle-kit push
```

## 📁 Estrutura do Projeto

- `/src`: Código fonte do frontend React.
- `/apps/api`: API Serverless rodando na borda da Cloudflare.
- `/apps/professional-app`: app mobile do profissional.
- `/apps/patient-app`: app mobile do paciente.
- `/drizzle`: Definições de esquema e migrações do PostgreSQL.
- `/docs2026`: Documentação técnica detalhada.

## 🔐 Segurança e Privacidade

- **No SEO**: Sistema privado, não indexado para proteção de dados clínicos.
- **Encryption**: Dados criptografados em repouso no Neon DB.
- **R2 Privacy**: Vídeos de exercícios protegidos por URLs assinadas.

---
Desenvolvido para transformar a fisioterapia brasileira com tecnologia de ponta.
