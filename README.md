# 🏥 FisioFlow - Sistema de Gestão para Fisioterapia

Sistema completo de gestão para clínicas de fisioterapia, desenvolvido com React + TypeScript + Firebase.

> **📚 Documentação Oficial**: [docs2026/](./docs2026/) - Documentação técnica completa do projeto

## 🚀 Funcionalidades Principais

### 👥 **Gestão de Pacientes**
- Cadastro completo de pacientes com histórico médico
- Upload de documentos e exames
- Controle de acesso baseado em funções (RBAC)
- Conformidade com LGPD

### 📅 **Agendamento de Consultas**
- Calendário avançado com visualizações (semana/dia/mês)
- Detecção automática de conflitos
- Consultas recorrentes
- Notificações automáticas

### 📝 **Prontuários Eletrônicos (SOAP)**
- Sistema completo de notas SOAP
- Assinaturas digitais
- Trilhas de auditoria
- Integração com planos de tratamento

### 💪 **Gestão de Exercícios**
- Biblioteca completa de exercícios com filtros avançados
- Prescrição personalizada de exercícios
- Acompanhamento de progresso em tempo real
- Protocolos baseados em evidências científicas
- Integração com registros SOAP

### 📊 **Analytics e Relatórios**
- Dashboard em tempo real
- Métricas de adesão dos pacientes
- Relatórios de progresso
- Análises de tendências

## 🛠 Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **Mobile**: React Native + Expo
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Firebase (Firestore + Auth + Realtime + Storage + Cloud Functions)
- **Autenticação**: Firebase Auth com Firestore Security Rules
- **Deploy**: Firebase Hosting (100% Firebase + GCP)

## 📋 Requisitos do Sistema

- Node.js 18+
- npm ou yarn
- Conta no Firebase

## ⚡ Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/fisioflow.git
cd fisioflow
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Renomeie `.env.example` para `.env` e configure:

```env
# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

# Google Calendar (Opcional)
VITE_GOOGLE_CLIENT_ID=seu_client_id
VITE_GOOGLE_API_KEY=sua_api_key

# Notificações (Opcional)
RESEND_API_KEY=sua_chave_resend
WHATSAPP_ACCESS_TOKEN=token_whatsapp_cloud
WHATSAPP_PHONE_NUMBER_ID=id_numero_telefone
WHATSAPP_BUSINESS_ACCOUNT_ID=id_conta_business
```

### 4. Configure o Firebase
- Crie um projeto no [Firebase Console](https://console.firebase.google.com) e ative Auth, Firestore e Storage.
- Configure as regras de segurança do Firestore conforme o arquivo `firestore.rules` do projeto.
- Para desenvolvimento local, opcional: `firebase emulators:start --only auth,firestore,storage`.

### 5. Execute o projeto
Inicie o frontend e o servidor de desenvolvimento do Inngest (para automações):

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Inngest (Background Jobs)
npx inngest-cli@latest dev
```

### 6. Edge Functions
Para funcionalidades críticas como reservas públicas e sync de calendário:

```bash
firebase deploy --only functions
# Ou deploy de funções específicas: firebase deploy --only functions:publicBooking,functions:googleCalendarSync
```

## 🚀 Deploy em Produção

### Firebase Hosting + GCP
1. Configure o projeto no [Firebase Console](https://console.firebase.google.com)
2. Build: `pnpm build`
3. Deploy: `firebase deploy --only hosting` (e `--only functions` para o backend)
4. CI/CD: use Cloud Build ou GitHub Actions com Firebase (veja [Plano Firebase + GCP](docs2026/PLANO_FIREBASE_GCP.md))

Para deploy contínuo (CI/CD), use **Cloud Build** ou **GitHub Actions** com Firebase. Veja [docs2026/PLANO_FIREBASE_GCP.md](docs2026/PLANO_FIREBASE_GCP.md) e [docs2026/11-deploy-producao.md](docs2026/11-deploy-producao.md).

## 🔐 Segurança e Conformidade

- ✅ Autenticação segura com Firebase Auth
- ✅ Firestore Security Rules ativadas
- ✅ Criptografia de dados sensíveis
- ✅ Conformidade com LGPD
- ✅ Headers de segurança configurados
- ✅ Assinaturas digitais para documentos

## 👨‍⚕️ Perfis de Usuário

### 🔴 **Administrador**
- Acesso completo ao sistema
- Gestão de usuários e permissões
- Relatórios financeiros

### 🟡 **Fisioterapeuta**
- Gestão de pacientes
- Prescrição de exercícios
- Criação de registros SOAP

### 🟢 **Estagiário**
- Acompanhamento de pacientes
- Visualização de protocolos

### 🔵 **Paciente**
- Acesso aos próprios dados
- Visualização de exercícios prescritos
- Histórico de consultas

## 🧪 Testes e Qualidade

### Checklist Pre-Deploy

**✅ Os testes são executados AUTOMATICAMENTE:**

1. **Localmente**: Git pre-commit hook roda antes de cada commit
2. **CI/CD**: GitHub Actions roda antes de cada deploy

**Instalar hooks locais (primeira vez):**

```bash
npm run hooks:install
```

**Executar manualmente se necessário:**

```bash
npm run test:pre-deploy     # Todos os testes
npm run test:race 100       # Apenas race conditions
npm run test:db-constraints # Apenas análise de código
```

### Testes Disponíveis

| Script NPM | Descrição | Uso |
|------------|-----------|-----|
| `npm run test:pre-deploy` | **Executa todos os testes pre-deploy** | `npm run test:pre-deploy` |
| `npm run test:race` | Detecta race conditions em inserts | `npm run test:race 100` |
| `npm run test:db-constraints` | Analisa constraints e patterns perigosos | `npm run test:db-constraints` |
| `npm run test:e2e` | Testes end-to-end | `npm run test:e2e` |
| `npm run test:coverage` | Cobertura de testes | `npm run test:coverage` |

> 📚 **Documentação completa**: Veja [DATABASE_PATTERNS.md](./DATABASE_PATTERNS.md) para aprender sobre padrões seguros de banco de dados.

### Build e Deploy

```bash
# Lint
npm run lint

# Build de produção
npm run build

# Preview da build
npm run preview
```

## 📈 Roadmap

Veja o [roadmap completo](./docs2026/13-roadmap.md) com:
- Funcionalidades implementadas
- Funcionalidades em desenvolvimento
- Melhorias necessárias
- Novas funcionalidades sugeridas

### Próximas Funcionalidades
- [ ] App Mobile (React Native)
- [ ] Sistema de Notificações Push (completo)
- [ ] Integração com WhatsApp
- [ ] Telemedicina completa
- [ ] IA para análise de movimento

### Melhorias Planejadas
- [ ] TypeScript Strict Mode
- [ ] Cobertura de testes >70%
- [ ] Performance optimization
- [ ] Acessibilidade WCAG 2.1 AA completo

## 🤝 Contribuição

Leia o [CONTRIBUTING.md](./CONTRIBUTING.md) para detalhes sobre como contribuir.

### Quick Start
1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: add nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 🔐 Segurança

⚠️ **IMPORTANTE**: Leia [SECURITY.md](./SECURITY.md) para políticas de segurança.

- ✅ Autenticação segura com Firebase Auth
- ✅ Firestore Security Rules ativadas
- ✅ Criptografia de dados sensíveis
- ✅ Conformidade com LGPD
- ✅ Headers de segurança configurados
- ✅ Assinaturas digitais para documentos
- ✅ Auditoria completa de operações

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👏 Créditos

Desenvolvido com ❤️ para modernizar a fisioterapia brasileira.

---

**FisioFlow** - Transformando o cuidado em saúde através da tecnologia.
