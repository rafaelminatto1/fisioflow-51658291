# FisioFlow - Guia de Deploy

## 📋 Visão Geral

Este documento contém as instruções completas para deploy do FisioFlow em produção usando Firebase e Google Cloud Platform.

## 🏗️ Arquitetura

- **Frontend**: React + TypeScript + Vite
- **Backend**: Firebase (BaaS)
- **Database**: Firestore / Cloud SQL (GCP)
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage
- **Deploy**: Firebase Hosting + Cloud Build
- **Styling**: Tailwind CSS + shadcn/ui



## 🗄️ Configuração do Firebase

### 1. Firebase Authentication

- Ativar **Email/Password**
- Ativar **Google** (opcional)
- Configurar domínios autorizados

### 2. Firestore Database

- Criar banco de dados em **Produção**
- Região: `southamerica-east1` (São Paulo) ou mais próxima
- Configurar regras de segurança (ver `firestore.rules`)

### 3. Firebase Storage

- Ativar **Cloud Storage for Firebase**
- Região: mesma do Firestore
- Configurar regras de segurança (ver `storage.rules`)

### 4. Firebase Cloud Functions

- Ativar **Cloud Functions** na região desejada
- Upgrade para plano **Blaze** (paga por uso) para funções
- Funções serverless para backend (API)
- Funções agendadas para tarefas de fundo (cron jobs)


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
- Variáveis de ambiente no Google Secret Manager para produção
- Variáveis locais para desenvolvimento

## 📊 Monitoramento

### Métricas Importantes
- Tempo de resposta da aplicação
- Taxa de erro nas requisições
- Uso de recursos do Supabase
- Performance das consultas
- Logs de segurança

### Logs
- Google Analytics para performance
- Firebase Console para banco de dados e funções
- Console do navegador para erros frontend

## 🔄 CI/CD

### GitHub Actions (Futuro)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare
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
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_FISIOFLOW_LOVABLE }}'
          channelId: live
          projectId: fisioflow-lovable
```

## 🆘 Troubleshooting

### Problemas Comuns



2. **Erro de conexão com Firebase**
   - Verificar chaves e configurações do Firebase
   - Verificar se o projeto Firebase está ativo
   - Verificar regras de segurança (Firestore/Storage)

3. **Problemas de autenticação**
   - Verificar configuração do Firebase Authentication
   - Verificar redirect URLs
   - Verificar provedores habilitados

### Comandos de Debug

```bash
# Verificar build local
npm run build
npm run preview

# Verificar tipos
npm run type-check

# Verificar linting
npm run lint

# Testar conexão Firebase
npm run test:firebase
```

## 📞 Suporte

- **Documentação**: [Firebase Docs](https://firebase.google.com/docs)
- **Issues**: Use o GitHub Issues para reportar problemas

---

**Última atualização**: Janeiro 2025  
**Versão**: 1.0.0  
**Status**: Produção Ready ✅