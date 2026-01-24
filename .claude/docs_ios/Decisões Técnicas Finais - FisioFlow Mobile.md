# Decisões Técnicas Finais - FisioFlow Mobile

**Data**: 24 de Janeiro de 2026
**Status**: ✅ APROVADO PELO CLIENTE

---

## 🎯 Decisões Confirmadas

### 1. **Arquitetura de Aplicativos**
- ✅ **2 aplicativos separados**:
  - **FisioFlow Pacientes** - App focado em engajamento e exercícios
  - **FisioFlow Profissionais** - App focado em produtividade e gestão

### 2. **Stack Tecnológica Mobile**

#### Frontend Mobile
- **Framework**: React Native
- **Tooling**: Expo (SDK 54+)
- **Linguagem**: TypeScript
- **Navegação**: React Navigation v6
- **UI Components**: React Native Paper ou NativeBase
- **Estilização**: NativeWind (Tailwind CSS para React Native)

#### Backend & Infraestrutura
- **Backend**: Firebase (Google Cloud Platform)
  - **Firebase Authentication** - Autenticação de usuários
  - **Cloud Firestore** - Banco de dados NoSQL
  - **Cloud SQL** - Banco de dados relacional (PostgreSQL)
  - **Firebase Cloud Functions** - Serverless functions
  - **Firebase Cloud Messaging** - Notificações push
  - **Firebase Storage** - Armazenamento de arquivos (vídeos, imagens)
  - **Firebase Hosting** - Hospedagem web

#### Build & Deploy
- **Build iOS**: Expo EAS Build (compilação na nuvem, sem Mac)
- **Deploy iOS**: Expo EAS Submit (submissão automática para App Store)
- **CI/CD**: GitHub Actions + EAS

### 3. **Plataformas**
- **Fase Inicial**: iOS (App Store)
- **Futuro**: Android (Google Play Store)

### 4. **Ambiente de Desenvolvimento**
- **Sistema Operacional**: Ubuntu (Linux)
- **Não precisa**: Mac ou VM com macOS
- **Motivo**: Expo EAS Build compila iOS na nuvem

---

## 📊 Migração de Supabase para Firebase

### Mapeamento de Serviços

| Supabase (Atual) | Firebase (Novo) | Observações |
|------------------|-----------------|-------------|
| Supabase Auth | Firebase Authentication | Suporta Google, Apple, Email/Password |
| PostgreSQL | Cloud Firestore + Cloud SQL | Firestore para real-time, Cloud SQL para relacional |
| Supabase Storage | Firebase Storage | Armazenamento de vídeos de exercícios |
| Supabase Realtime | Firestore Real-time Listeners | Sincronização em tempo real |
| Edge Functions | Cloud Functions | Serverless functions |
| Vercel Hosting | Firebase Hosting | Hospedagem web |

### Estratégia de Migração

**Opção 1: Migração Gradual (Recomendado)**
1. Manter sistema web atual no Supabase
2. Criar apps mobile com Firebase
3. Sincronizar dados entre Supabase e Firebase via Cloud Functions
4. Migrar web para Firebase posteriormente

**Opção 2: Migração Completa**
1. Migrar todo o backend para Firebase de uma vez
2. Atualizar sistema web e mobile simultaneamente
3. Maior risco, mas arquitetura unificada desde o início

**Decisão**: Opção 1 (migração gradual) para reduzir riscos

---

## 🚀 Fases de Desenvolvimento

### ✅ Fase 1: Planejamento e Análise (CONCLUÍDA)
- Análise do código-fonte atual
- Pesquisa de tecnologias
- Definição de arquitetura
- Aprovação de decisões técnicas

### 🔄 Fase 2: App do Profissional (MVP) - EM ANDAMENTO
**Duração estimada**: 3-5 semanas
**Prioridade**: ALTA

**Funcionalidades MVP**:
1. Autenticação (Firebase Auth)
2. Dashboard Mobile
3. Agenda Mobile (PRIORIDADE MÁXIMA)
4. Lista de Pacientes
5. Perfil do Paciente
6. Prontuário Rápido (SOAP)

### 📅 Fase 3: App do Paciente (MVP)
**Duração estimada**: 2-4 semanas
**Início**: Após conclusão da Fase 2

**Funcionalidades MVP**:
1. Autenticação (Firebase Auth)
2. Tela "Hoje" (exercícios do dia)
3. Lista de Exercícios
4. Modo de Execução de Exercício
5. Gráficos de Progresso
6. Notificações Push

### 📅 Fase 4: Melhorias e Funcionalidades Avançadas
**Início**: Após lançamento dos MVPs

**Para Profissionais**:
- Prescrição de exercícios mobile
- Análise de movimento com IA
- Relatórios e analytics
- Assinatura digital

**Para Pacientes**:
- Gamificação (streaks, badges)
- Mapa da dor interativo
- Chat com fisioterapeuta
- Integração com Apple Health

---

## 🛠️ Estrutura de Repositório

### Monorepo (Recomendado)

```
/fisioflow-monorepo
├── apps/
│   ├── web/                    # Sistema web atual (React + Vite)
│   ├── mobile-patient/         # App React Native - Pacientes
│   │   ├── src/
│   │   ├── app.json
│   │   └── package.json
│   └── mobile-pro/             # App React Native - Profissionais
│       ├── src/
│       ├── app.json
│       └── package.json
├── packages/
│   ├── ui/                     # Componentes compartilhados
│   ├── api/                    # Cliente Firebase
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utilitários
├── eas.json                    # Configuração EAS Build
└── package.json                # Root package.json
```

---

## 🔐 Configurações Necessárias

### Firebase
- [ ] Criar projeto no Firebase Console
- [ ] Configurar Firebase Authentication (Google, Apple, Email)
- [ ] Criar banco Cloud Firestore
- [ ] Configurar Cloud SQL (PostgreSQL)
- [ ] Configurar Firebase Storage
- [ ] Configurar Cloud Functions
- [ ] Obter credenciais (google-services.json, GoogleService-Info.plist)

### Expo
- [ ] Conta Expo criada
- [ ] EAS CLI instalado (`npm install -g eas-cli`)
- [ ] Login no EAS (`eas login`)
- [ ] Configurar credenciais Apple no EAS

### Apple Developer
- [x] Conta Apple Developer ativa ($99/ano)
- [ ] Criar App IDs no Apple Developer Portal
  - `com.fisioflow.patient`
  - `com.fisioflow.pro`
- [ ] Configurar App Store Connect
- [ ] Criar apps no App Store Connect

---

## 📦 Dependências Principais

### Mobile (React Native)

```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "react-native": "0.76.x",
    "react": "19.x",
    "typescript": "^5.3.0",
    
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    
    "firebase": "^11.0.0",
    "@react-native-firebase/app": "^21.0.0",
    "@react-native-firebase/auth": "^21.0.0",
    "@react-native-firebase/firestore": "^21.0.0",
    "@react-native-firebase/storage": "^21.0.0",
    "@react-native-firebase/messaging": "^21.0.0",
    
    "nativewind": "^4.0.0",
    "react-native-paper": "^5.12.0",
    
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0"
  }
}
```

---

## 💰 Custos Estimados

### Infraestrutura (Mensal)

| Serviço | Plano | Custo |
|---------|-------|-------|
| Firebase (Blaze) | Pay-as-you-go | $0-$50/mês (estimado) |
| Expo EAS Build | Production | $29/mês |
| Apple Developer | Anual | $99/ano (~$8/mês) |
| **Total Mensal** | | **~$37-$87/mês** |

### Desenvolvimento

| Fase | Duração | Custo Estimado |
|------|---------|----------------|
| Fase 2: App Profissional | 3-5 semanas | $10,000 - $20,000 |
| Fase 3: App Paciente | 2-4 semanas | $8,000 - $15,000 |
| **Total** | **5-9 semanas** | **$18,000 - $35,000** |

---

## 📈 Métricas de Sucesso

### App do Profissional
- ✅ 100% dos profissionais usando o app em 3 meses
- ✅ 80% dos agendamentos feitos pelo app
- ✅ Tempo médio de criação de prontuário < 2 minutos
- ✅ Taxa de satisfação > 4.5/5

### App do Paciente
- ✅ 60% dos pacientes com app instalado em 6 meses
- ✅ Taxa de adesão aos exercícios > 70%
- ✅ Engajamento diário > 40%
- ✅ Taxa de retenção 30 dias > 60%

---

## 🎯 Próximos Passos Imediatos

### 1. Setup Firebase (1-2 dias)
- Criar projeto Firebase
- Configurar Authentication
- Configurar Firestore e Cloud SQL
- Configurar Storage e Functions

### 2. Estruturar Monorepo (1 dia)
- Criar estrutura de pastas
- Configurar workspaces
- Configurar EAS Build

### 3. Iniciar Fase 2: App Profissional (3-5 semanas)
- Implementar autenticação
- Desenvolver tela de agenda (PRIORIDADE)
- Implementar dashboard
- Desenvolver funcionalidades de prontuário

---

## 📝 Observações Importantes

### Prioridades de UX/UI
1. **Página de Agendamento** - Foco máximo, interface limpa e rápida
2. **Prontuário (SOAP)** - Entrada rápida e eficiente
3. **Design moderno** - Cores, espaçamento e hierarquia visual

### Restrições
- ❌ **Sem telemedicina/teleconsulta**
- ❌ **Sem SMS** (usar WhatsApp e notificações push)
- ✅ **Cadastro mínimo**: apenas nome obrigatório
- ✅ **Limite de agendamentos**: 4 pacientes por horário (configurável)

### Funcionalidades Futuras (Não MVP)
- Gamificação para pacientes
- Mapa da dor interativo
- Análise de movimento com IA
- Chat integrado
- Integração com Apple Health/Google Fit

---

**Documento aprovado e pronto para implementação.**
