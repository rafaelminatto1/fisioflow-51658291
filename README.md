# 🏥 FisioFlow - Gestão Inteligente para Fisioterapia

Plataforma de alta performance para clínicas de fisioterapia, utilizando a stack mais moderna de 2026: **Neon DB + Cloudflare Workers**.

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

### 3. Scripts Principais

```bash
# Iniciar frontend
npm run dev

# Iniciar backend local (Wrangler)
cd workers && npm run dev

# Migrações de Banco de Dados
npx drizzle-kit push
```

## 📁 Estrutura do Projeto

- `/src`: Código fonte do frontend React.
- `/workers`: API Serverless rodando na borda da Cloudflare.
- `/drizzle`: Definições de esquema e migrações do PostgreSQL.
- `/docs2026`: Documentação técnica detalhada.

## 🔐 Segurança e Privacidade

- **No SEO**: Sistema privado, não indexado para proteção de dados clínicos.
- **Encryption**: Dados criptografados em repouso no Neon DB.
- **R2 Privacy**: Vídeos de exercícios protegidos por URLs assinadas.

---
Desenvolvido para transformar a fisioterapia brasileira com tecnologia de ponta.
