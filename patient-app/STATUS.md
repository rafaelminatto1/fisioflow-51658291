# FisioFlow - Status do Projeto

**Última atualização:** 01/02/2026
**Versão:** 1.0.0-mvp

## 📊 Progresso Geral: 92%

| Componente | Status | Completude |
|------------|--------|-----------|
| Web App (Profissionais) | ✅ Produção | 90% |
| Professional iOS App | ✅ Funcional | 85% |
| Backend API (Firebase Functions) | ✅ Produção | 95% |
| Patient iOS App | ✅ MVP Avançado | **92%** |
| Integrações | ⚠️ Parcial | 60% |
| Testes | ⚠️ Insuficiente | 30% |

---

## 🎉 Patient iOS App - Recém Lançado MVP

### ✅ Funcionalidades Implementadas

#### Autenticação
- [x] Login com email/senha
- [x] Registro de novos pacientes
- [x] Recuperação de senha
- [x] Vinculação ao profissional via código
- [x] Sessão persistente (AsyncStorage)

#### Telas Principais
- [x] **Dashboard** - Visão geral com:
  - Saudação dinâmica
  - Cards de estatísticas (exercícios, streak, consulta)
  - Exercícios de hoje (até 3 preview)
  - Próxima consulta em destaque
  - Acesso rápido (4 botões coloridos)

- [x] **Exercícios** - Gerenciamento completo:
  - Listagem de planos ativos
  - Marcar exercícios como completos
  - Indicador de progresso visual
  - **Video Modal** com expo-av para demonstrações
  - Controles de playback (velocidade)

- [x] **Consultas** - Agendamentos:
  - Separação entre próximas e anteriores
  - Badges de status coloridos
  - Detalhes (data, horário, tipo)

- [x] **Progresso** - Acompanhamento:
  - Timeline de evoluções SOAP
  - Gráfico de nível de dor (vitória-native)
  - Estatísticas (sessões, dias, melhora)
  - Filtro por período (7 dias, 30 dias, tudo)

- [x] **Perfil** - Configurações:
  - Dados do usuário
  - Menu de configurações
  - Logout

#### Componentes UI
- [x] Button (com loading state)
- [x] Card (estilizado)
- [x] Input (com ícones e validação)
- [x] VideoModal (player completo)
- [x] NotificationPermissionModal (solicitação de permissão)

#### Integrações
- [x] Firebase Auth
- [x] Firebase Firestore (real-time)
- [x] Firebase Storage (configurado)

#### Sistema de Notificações (#35) - ✅ COMPLETO
- [x] Configurar expo-notifications
- [x] Sistema de permissões (requestNotificationPermissions)
- [x] Registro de push token no Firestore (registerPushToken)
- [x] Limpeza de token no logout (clearPushToken)
- [x] Canais de notificação Android (createNotificationChannel)
- [x] Hooks customizados (usePatientNotifications, useNotificationResponse, useNotificationReceived)
- [x] Modal de solicitação de permissão no dashboard
- [x] Configurações de notificação no perfil
- [x] Auto-registro de token no login (auth store)
- [x] EAS Project ID configurado
- [ ] Cloud functions para envio (pendente)
- [ ] Lembretes de exercícios (pendente)
- [ ] Lembretes de consultas (pendente)

### 🔄 Em Andamento

#### Sincronização Offline (#36) - ✅ COMPLETO
- [x] OperationQueue para operações pendentes (offlineManager.ts)
- [x] NetInfo para detectar status (useNetworkStatus hook)
- [x] Cache com AsyncStorage (getCachedData/setCachedData)
- [x] Sync automático ao reconectar
- [x] Indicador visual de sync (SyncIndicator component)
- [x] Hook de integração (useOfflineSync)
- [x] Integração com tela de exercícios
- [x] Limpeza de fila no logout
- [x] Suporte a múltiplos tipos de operação (exercise, profile, feedback, appointments)

#### EAS Build & Deploy (#38) - 80% Completo
- [x] Configurar eas.json (profiles: dev, preview, testflight, production)
- [x] Script de build automatizado (build-scripts.sh)
- [x] Guia de setup completo (EAS_SETUP_GUIDE.md)
- [x] Política de privacidade (PRIVACY_POLICY.md)
- [x] Guia de screenshots (SCREENSHOTS_GUIDE.md)
- [x] Configuração de notificações push
- [ ] Certificados iOS (serão gerados automaticamente pelo EAS)
- [ ] Screenshots App Store (pendentes)
- [ ] Criar App no App Store Connect
- [ ] Primeiro build TestFlight
- [ ] Submissão para review

---

## 📂 Estrutura de Arquivos

```
patient-app/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx               # Login com Firebase
│   │   ├── register.tsx            # Registro de novos pacientes
│   │   ├── forgot-password.tsx     # Recuperação de senha
│   │   ├── link-professional.tsx   # Vincular ao profissional
│   │   └── _layout.tsx             # Auth navigator
│   ├── (tabs)/
│   │   ├── index.tsx               # Dashboard + notification + sync indicator
│   │   ├── exercises.tsx           # Gerenciar exercícios + offline sync
│   │   ├── appointments.tsx        # Consultas agendadas
│   │   ├── progress.tsx            # Progresso/evoluções
│   │   ├── profile.tsx             # Perfil + configurações de notificação
│   │   └── _layout.tsx             # Tabs layout + notification listeners
│   └── _layout.tsx                 # Root layout + tema + notification init
├── components/
│   ├── Button.tsx                  # Botão reutilizável
│   ├── Card.tsx                    # Card estilizado
│   ├── Input.tsx                   # Input com ícones
│   ├── VideoModal.tsx              # Modal de vídeo
│   ├── NotificationPermissionModal.tsx  # Modal de permissão de notificação
│   ├── SyncIndicator.tsx           # Indicador de sync/offline status
│   └── index.ts                    # Exportações
├── lib/
│   ├── firebase.ts                 # Configuração Firebase
│   ├── notificationsSystem.ts      # Sistema de notificações completo
│   └── offlineManager.ts           # Sistema de sincronização offline
├── store/
│   └── auth.ts                     # Zustand store + push token + offline cleanup
├── hooks/
│   ├── useColorScheme.ts           # Hook de tema
│   ├── useNetworkStatus.ts         # Hook de status de rede
│   ├── useOfflineSync.ts           # Hook de sincronização offline
│   └── index.ts                    # Exportações
├── deploy/
│   ├── eas.json                    # Configuração EAS Build
│   ├── build-scripts.sh            # Script de build automatizado
│   ├── EAS_SETUP_GUIDE.md          # Guia completo de setup
│   ├── PRIVACY_POLICY.md           # Política de privacidade
│   └── SCREENSHOTS_GUIDE.md        # Guia de screenshots
├── types/
│   └── index.ts                    # Tipos TypeScript
```

---

## 🔥 Diferenciais do App Profissional

| Recurso | Patient App | Professional App |
|---------|--------------|-------------------|
| **Foco** | Execução e auto-gestão | Prescrição e gestão |
| **Cores** | Verde saúde (#22c55e) | Azul profissional (#3b82f6) |
| **Tela inicial** | Dashboard pessoal | Lista de pacientes |
| **Exercícios** | Ver e completar | Criar e prescrever |
| **Evoluções** | Visualizar histórico | Criar e gerenciar |
| **Vínculo** | Código de convite | Aceitar pacientes |

---

## 🚀 Como Executar

```bash
# Entrar no diretório
cd patient-app

# Instalar dependências (primeira vez)
pnpm install

# Iniciar Expo
pnpm start
```

**No iPhone:**
1. Abrir app Expo Go
2. Escanear QR code
3. Aguardar carregar

---

## 📋 Checklist para Lançamento

### Fase 1: Testes Internos (Semana atual)
- [x] Testar fluxo completo de cadastro
- [x] Testar vincular profissional
- [x] Testar completar exercícios
- [x] Testar vídeo player
- [x] Verificar Firebase Auth
- [x] Testar temas claro/escuro
- [x] Testar sistema de notificações
- [x] Testar sistema offline (fila, sync)

### Fase 2: Notificações (Completado)
- [x] Setup expo-notifications
- [ ] Cloud functions para envio
- [ ] Testar lembretes com notificações reais

### Fase 3: Offline (Completado)
- [x] Sync manager
- [x] Cache local
- [x] Testar fluxo offline→online

### Fase 4: Deploy (Próximo)
- [ ] EAS Build configuration
- [ ] Certificados iOS
- [ ] App Store metadata
- [ ] TestFlight beta

---

**Próxima revisão:** 07/02/2026
**Responsável:** Desenvolvimento FisioFlow
