# FisioFlow - Guia de Deploy

## 📋 Visão Geral

Este documento contém as instruções completas para deploy do FisioFlow em produção usando Vercel e Supabase.

## 🏗️ Arquitetura

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (BaaS)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deploy**: Vercel
- **Styling**: Tailwind CSS + shadcn/ui

## 🚀 Deploy na Vercel

### Pré-requisitos

1. Conta na Vercel
2. Repositório no GitHub
3. Projeto Supabase configurado

### Passos para Deploy

1. **Conectar Repositório**
   ```bash
   # Clone o repositório
   git clone <repository-url>
   cd fisioflow
   ```

2. **Instalar Dependências**
   ```bash
   npm install
   ```

3. **Configurar Variáveis de Ambiente**
   
   Na Vercel, configure as seguintes variáveis:
   ```bash
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_APP_ENV=production
   ```

4. **Deploy Automático**
   - Conecte o repositório GitHub à Vercel
   - Configure o build command: `npm run build`
   - Configure o output directory: `dist`
   - Deploy será automático a cada push na branch `main`

## 🗄️ Configuração do Supabase

### Estrutura do Banco de Dados

#### Tabelas Principais
- `profiles` - Perfis de usuários
- `patients` - Dados dos pacientes
- `appointments` - Agendamentos
- `exercises` - Biblioteca de exercícios
- `exercise_plans` - Planos de exercícios
- `soap_records` - Registros SOAP
- `patient_documents` - Documentos dos pacientes
- `treatment_sessions` - Sessões de tratamento

#### Funcionalidades Avançadas
- `smart_progression` - Progressão inteligente
- `smart_adaptation` - Adaptação inteligente
- `smart_reports` - Relatórios inteligentes
- `email_notifications` - Notificações por email

### Migrações

Todas as migrações estão na pasta `supabase/migrations/`. Para aplicar:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login no Supabase
supabase login

# Aplicar migrações
supabase db push
```

### Storage Buckets

- `patient-documents` - Documentos dos pacientes
- `exercise-media` - Mídia dos exercícios
- `profile-avatars` - Avatares dos usuários

### Políticas RLS

Todas as tabelas possuem Row Level Security (RLS) habilitado com políticas específicas para:
- Leitura baseada no perfil do usuário
- Escrita restrita ao proprietário dos dados
- Administradores com acesso completo

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Linting
npm run lint

# Testes
npm run test

# Type checking
npm run type-check
```

## 🔒 Segurança

### Implementado
- ✅ Row Level Security (RLS)
- ✅ Autenticação JWT
- ✅ HTTPS obrigatório
- ✅ Validação de inputs
- ✅ Sanitização de dados

### Variáveis de Ambiente

Nunca commite arquivos `.env` com dados sensíveis. Use sempre:
- `.env.example` para templates
- Variáveis de ambiente na Vercel para produção
- Variáveis locais para desenvolvimento

## 📊 Monitoramento

### Métricas Importantes
- Tempo de resposta da aplicação
- Taxa de erro nas requisições
- Uso de recursos do Supabase
- Performance das consultas
- Logs de segurança

### Logs
- Vercel Analytics para performance
- Supabase Dashboard para banco de dados
- Console do navegador para erros frontend

## 🔄 CI/CD

### GitHub Actions (Futuro)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Deploy to Vercel
        uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🆘 Troubleshooting

### Problemas Comuns

1. **Build falha na Vercel**
   - Verificar se todas as dependências estão no `package.json`
   - Verificar se as variáveis de ambiente estão configuradas
   - Verificar logs de build na Vercel

2. **Erro de conexão com Supabase**
   - Verificar URL e chave anônima
   - Verificar se o projeto Supabase está ativo
   - Verificar políticas RLS

3. **Problemas de autenticação**
   - Verificar configuração do Supabase Auth
   - Verificar redirect URLs
   - Verificar políticas de segurança

### Comandos de Debug

```bash
# Verificar build local
npm run build
npm run preview

# Verificar tipos
npm run type-check

# Verificar linting
npm run lint

# Testar conexão Supabase
npm run test:supabase
```

## 📞 Suporte

- **Documentação**: [Vercel Docs](https://vercel.com/docs)
- **Supabase**: [Supabase Docs](https://supabase.com/docs)
- **Issues**: Use o GitHub Issues para reportar problemas

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0.0  
**Status**: Produção Ready ✅