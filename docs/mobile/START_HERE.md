# 📱 FisioFlow iOS - Guia Rápido

Este guia fornece acesso rápido à documentação completa do app iOS.

## 🚀 Comece Aqui

### Novo no Projeto iOS?
1. Leia [README.md](./README.md) - Visão geral do app
2. Siga [GUIA_IMPLEMENTACAO.md](./GUIA_IMPLEMENTACAO.md) - Passo a passo completo
3. Use [CHECKLIST_APP_STORE.md](./CHECKLIST_APP_STORE.md) - Para publicação

### Precisa de Ajuda Rápida?
- [Problemas com Xcode?](./REQUISITOS_IOS.md#troubleshooting)
- [Dúvidas sobre features?](./FEATURES_EXCLUSIVAS_IOS.md)
- [Diferenças web vs mobile?](./DIFERENCAS_WEB_MOBILE.md)

## 📚 Índice Completo

### Guias Principais
| Documento | O Que Contém | Quando Usar |
|-----------|---------------|-------------|
| [README.md](./README.md) | Visão geral, stack, features | Primeira leitura |
| [GUIA_IMPLEMENTACAO.md](./GUIA_IMPLEMENTACAO.md) | Setup iOS, build, config | Ao implementar |
| [REQUISITOS_IOS.md](./REQUISITOS_IOS.md) | Requisitos, ambiente, troubleshooting | Ao configurar |
| [CHECKLIST_APP_STORE.md](./CHECKLIST_APP_STORE.md) | Checklist publicação | Ao publicar |
| [RESUMO_IMPLEMENTACAO.md](./RESUMO_IMPLEMENTACAO.md) | O que foi feito, próximos passos | Status atual |

### Referências Técnicas
| Documento | O Que Contém | Quando Usar |
|-----------|---------------|-------------|
| [DIFERENCAS_WEB_MOBILE.md](./DIFERENCAS_WEB_MOBILE.md) | Web vs Mobile comparado | Ao planejar features |
| [FEATURES_EXCLUSIVAS_IOS.md](./FEATURES_EXCLUSIVAS_IOS.md) | Features nativas com código | Ao implementar features |
| [ESTADO_ATUAL.md](./ESTADO_ATUAL.md) | Snapshot do projeto | Contexto do projeto |

## ⚡ Quick Start

### Setup Inicial (5 min)

```bash
# 1. Verificar ambiente
./verify-ios-setup.sh

# 2. Adicionar iOS
npm run cap:ios

# 3. Build e sync
npm run build
npm run cap:sync

# 4. Abrir Xcode
npm run cap:open:ios
```

### Testar no Simulador (2 min)

```bash
# Via terminal
npm run cap:run:ios

# Ou via Xcode
# 1. Selecione simulador (iPhone 15 Pro)
# 2. Clique em ▶️ (Run)
```

## 🎯 Funcionalidades iOS

| Feature | Status | Hook/Service |
|---------|--------|--------------|
| Face ID / Touch ID | ✅ Código pronto | `useBiometricAuth()` |
| Push Notifications | ✅ Código pronto | `initPushNotifications()` |
| Câmera | ✅ Código pronto | `useCamera()` |
| Geolocalização | ✅ Código pronto | `useGeolocation()` |
| Haptics | ✅ Código pronto | `hapticFeedback` |
| Share Sheet | ✅ Código pronto | `shareContent()` |
| Safe Area | ✅ Código pronto | `<SafeArea>` |
| Bottom Tab Bar | ✅ Código pronto | `<BottomTabBar>` |

## 📂 Arquivos Importantes

### Hooks Mobile
- `src/hooks/useBiometricAuth.ts` - Biometria
- `src/hooks/useCamera.ts` - Câmera
- `src/hooks/useGeolocation.ts` - GPS

### Serviços Mobile
- `src/lib/mobile/push-notifications.ts` - Push
- `src/lib/mobile/haptics.ts` - Haptics
- `src/lib/mobile/share.ts` - Share

### Componentes Mobile
- `src/components/mobile/BottomTabBar.tsx` - Navegação
- `src/components/mobile/SafeArea.tsx` - Safe area

## 🔗 Links Úteis

- [Capacitor Docs](https://capacitorjs.com/docs/ios)
- [Xcode Download](https://developer.apple.com/xcode/)
- [Apple Developer](https://developer.apple.com/programs/)
- [App Store Connect](https://appstoreconnect.apple.com)

## 💬 Dúvidas?

- 📧 Email: mobile@fisioflow.com
- 💬 Discord: [Servidor FisioFlow](https://discord.gg/fisioflow)
- 🐛 Issues: [GitHub Issues](https://github.com/fisioflow/fisioflow/issues)

---

**Última atualização**: 19 de Janeiro de 2026
