# 📱 FisioFlow Mobile - Documentação Oficial

Bem-vindo à documentação oficial do aplicativo **FisioFlow para iPhone**.

## 🎯 Visão Geral

O **FisioFlow Mobile** é a versão nativa para iOS do sistema de gestão para clínicas de fisioterapia. Desenvolvido com **React Native e Expo**, oferece uma experiência verdadeiramente nativa, compartilhando a lógica de negócios com a web mas com UI otimizada para mobile.

### 🔄 Diferenças Web vs Mobile

| Aspecto | Web App | iOS App (React Native) |
|---------|---------|---------|
| **Tecnologia** | React DOM | React Native |
| **Plataforma** | Navegador (Safari, Chrome) | Nativo iPhone |
| **Distribuição** | URL/Vercel | App Store |
| **Instalação** | Acesso via link | Download da App Store |
| **Biometria** | ❌ Não disponível | ✅ Face ID/Touch ID |
| **Push Notifications** | ⚠️ Limitado (PWA) | ✅ Nativo completo |
| **Câmera** | ⚠️ Via browser | ✅ Acesso nativo |
| **Geolocalização** | ⚠️ Via browser | ✅ GPS preciso |
| **Offline** | ⚠️ Service Worker | ✅ SQLite / Cache Nativo |
| **Performance** | Boa | ✅ Otimizada |
| **UI/UX** | Desktop-first | Mobile-first |

## 📋 Índice da Documentação

### 📘 Guias Principais

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [REQUISITOS_IOS.md](./REQUISITOS_IOS.md) | Requisitos e setup do ambiente iOS | ✅ |
| [DIFERENCAS_WEB_MOBILE.md](./DIFERENCAS_WEB_MOBILE.md) | O que muda entre web e mobile | ✅ |
| [FEATURES_EXCLUSIVAS_IOS.md](./FEATURES_EXCLUSIVAS_IOS.md) | Features só do app iOS | ✅ |
| [GUIA_IMPLEMENTACAO.md](./GUIA_IMPLEMENTACAO.md) | Passo a passo de implementação | ✅ |
| [TESTES_IOS.md](./TESTES_IOS.md) | Estratégia de testes iOS | ✅ |
| [CHECKLIST_APP_STORE.md](./CHECKLIST_APP_STORE.md) | Checklist para publicação | ✅ |
| [ESTADO_ATUAL.md](./ESTADO_ATUAL.md) | Snapshot do projeto antes do mobile | ✅ |

## 🚀 Stack Tecnológico

```
Core: React Native + Expo
UI: NativeWind (Tailwind) + Expo Router
Backend: Supabase (PostgreSQL + Auth + Real-time)
Build: EAS Build
Deploy: App Store
Monitor: Sentry + Vercel Analytics
```

## 🎨 Design System

### Cores Principais
- **Primary**: `#0EA5E9` (Sky Blue)
- **Secondary**: `#6366F1` (Indigo)
- **Success**: `#22C55E` (Green)
- **Warning**: `#F59E0B` (Amber)
- **Error**: `#EF4444` (Red)

### Tipografia
- **Font**: Inter (system font)
- **Títulos**: Sans-serif, 600-700 weight
- **Corpo**: Sans-serif, 400-500 weight

### Componentes
Baseados em **React Native Paper** ou **Tamagui** com adaptações para mobile:
- Botões touch-friendly (min 44x44px)
- Bottom Tab Bar para navegação
- Safe Area para notch
- Swipe gestures

## 📱 Funcionalidades do App

### ✅ Implementadas (Web)
- [x] Autenticação com Supabase
- [x] Gestão de Pacientes
- [x] Agenda/Agendamentos
- [x] Prontuário SOAP
- [x] Biblioteca de Exercícios
- [x] Telemedicina básica
- [x] Notificações (web)

### 🆕 Exclusivas iOS
- [ ] Autenticação Biométrica (Face ID/Touch ID)
- [ ] Push Notifications Nativas
- [ ] Câmera Nativa
- [ ] Geolocalização Precisa
- [ ] Offline Mode Avançado

### ❌ Não Disponíveis no Mobile
- [ ] Admin de Sistema
- [ ] Relatórios Complexos (simplificados)
- [ ] Configurações Avançadas

## 🔐 Segurança e Privacidade

### LGPD Compliance
- ✅ Criptografia de dados sensíveis
- ✅ Consentimento explícito
- ✅ Direito ao esquecimento
- ✅ Audit trail completo

### Segurança iOS
- ✅ SecureStore para tokens
- ✅ Biometria para login rápido
- ✅ Certificate Pinning
- ✅ Jailbreak detection

## 📊 Monitoramento e Analytics

### Ferramentas
- **Sentry**: Error tracking
- **Vercel Analytics**: Web vitals
- **Firebase Analytics**: App metrics (futuro)

### Métricas Monitoradas
- Performance de carregamento
- Taxa de erro
- Engagement diário
- Retenção de usuários

## 🛠️ Desenvolvimento

### Pré-requisitos
- Node.js 18.0+
- Expo CLI
- Conta Apple Developer ($99/ano) (para deploy)
- (Opcional) macOS + Xcode para simulador local

### Setup Rápido
```bash
# Clone o repositório
git clone <repo-url>
cd fisioflow-51658291

# Instale as dependências
npm install

# Inicie o projeto com Expo
npx expo start

# Escaneie o QR Code com o app Expo Go no seu iPhone
```

### Workflow de Desenvolvimento
1. Faça alterações no código
2. O Expo Go atualiza automaticamente (Fast Refresh)
3. Teste no dispositivo físico ou simulador
4. Commit e push

## 🧪 Testes

### Tipos de Testes
- **Unit**: Jest + React Native Testing Library
- **E2E**: Maestro ou Detox
- **Manual**: Testes em dispositivo real via Expo Go

### Cobertura Atual
- ~45-55% (meta: >70%)

## 📦 Deploy

### Build de Produção
```bash
# Build via EAS
eas build --platform ios

# Submeter para App Store
eas submit --platform ios
```

### Publicação na App Store
Ver [CHECKLIST_APP_STORE.md](./CHECKLIST_APP_STORE.md) para detalhes completos.

## 🔗 Links Úteis

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Supabase Docs](https://supabase.com/docs)

## 🆘 Suporte

- 📧 Email: mobile@fisioflow.com
- 💬 Discord: [Servidor FisioFlow](https://discord.gg/fisioflow)
- 🐛 Issues: [GitHub Issues](https://github.com/fisioflow/fisioflow/issues)

## 📄 Licença

Este projeto está licenciado sob a MIT License.

---

**Última atualização**: 24 de Janeiro de 2026
**Versão**: 1.1.0
**Mantido por**: Equipe FisioFlow Mobile
