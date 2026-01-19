# 📱 FisioFlow Mobile - Documentação Oficial

Bem-vindo à documentação oficial do aplicativo **FisioFlow para iPhone**.

## 🎯 Visão Geral

O **FisioFlow Mobile** é a versão nativa para iOS do sistema de gestão para clínicas de fisioterapia. Desenvolvido com **Capacitor 7**, transforma o aplicativo web React em um app nativo para iPhone com acesso a recursos exclusivos do dispositivo.

### 🔄 Diferenças Web vs Mobile

| Aspecto | Web App | iOS App |
|---------|---------|---------|
| **Plataforma** | Navegador (Safari, Chrome) | Nativo iPhone |
| **Distribuição** | URL/Vercel | App Store |
| **Instalação** | Acesso via link | Download da App Store |
| **Biometria** | ❌ Não disponível | ✅ Face ID/Touch ID |
| **Push Notifications** | ⚠️ Limitado (PWA) | ✅ Nativo completo |
| **Câmera** | ⚠️ Via browser | ✅ Acesso nativo |
| **Geolocalização** | ⚠️ Via browser | ✅ GPS preciso |
| **Offline** | ⚠️ Service Worker | ✅ Cache nativo |
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
Core: React 18 + TypeScript + Vite
UI: shadcn/ui + Tailwind CSS
Backend: Supabase (PostgreSQL + Auth + Real-time)
Mobile: Capacitor 7.4.3
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
Baseados em **shadcn/ui** com adaptações para mobile:
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
- ✅ Keychain para tokens
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
- macOS 12.0+ (Monterey)
- Xcode 13.0+
- Node.js 18.0+
- CocoaPods 1.11.0+
- Conta Apple Developer ($99/ano)

### Setup Rápido
```bash
# Clone o repositório
git clone <repo-url>
cd fisioflow-51658291

# Instale as dependências
pnpm install

# Adicione a plataforma iOS
npm run cap:ios

# Build e sync
npm run build
npm run cap:sync

# Abra no Xcode
npm run cap:open:ios
```

### Workflow de Desenvolvimento
1. Faça alterações no código
2. `npm run build` - Build do projeto
3. `npm run cap:sync` - Sincroniza com iOS
4. Teste no simulador/dispositivo
5. Commit e push

## 🧪 Testes

### Tipos de Testes
- **Unit**: Vitest para lógica
- **Component**: React Testing Library
- **E2E**: Playwright para fluxos críticos
- **Manual**: Testes em dispositivo real

### Cobertura Atual
- ~45-55% (meta: >70%)

## 📦 Deploy

### Build de Produção
```bash
# Build otimizado
npm run build:prod

# Sync com iOS
npm run cap:sync

# Abrir no Xcode para archive
npm run cap:open:ios
```

### Publicação na App Store
Ver [CHECKLIST_APP_STORE.md](./CHECKLIST_APP_STORE.md) para detalhes completos.

## 🔗 Links Úteis

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

## 🆘 Suporte

- 📧 Email: mobile@fisioflow.com
- 💬 Discord: [Servidor FisioFlow](https://discord.gg/fisioflow)
- 🐛 Issues: [GitHub Issues](https://github.com/fisioflow/fisioflow/issues)

## 📄 Licença

Este projeto está licenciado sob a MIT License.

---

**Última atualização**: 19 de Janeiro de 2026
**Versão**: 1.0.0
**Mantido por**: Equipe FisioFlow Mobile
