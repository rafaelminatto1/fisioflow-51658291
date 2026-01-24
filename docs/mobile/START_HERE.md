# 📱 FisioFlow iOS - Guia Rápido (React Native + Expo)

Este guia fornece acesso rápido à documentação completa do app iOS desenvolvido com **React Native e Expo**.

## 🚀 Comece Aqui

### Novo no Projeto iOS?
1. Leia [README.md](./README.md) - Visão geral e stack tecnológica
2. Siga [GUIA_IMPLEMENTACAO.md](./GUIA_IMPLEMENTACAO.md) - Passo a passo para criar o projeto
3. Configure o ambiente com [REQUISITOS_IOS.md](./REQUISITOS_IOS.md)

### Precisa de Ajuda Rápida?
- [Problemas com Expo?](./REQUISITOS_IOS.md)
- [Checklist de publicação?](./CHECKLIST_APP_STORE.md)

## 📚 Índice Completo

### Guias Principais
| Documento | O Que Contém | Quando Usar |
|-----------|---------------|-------------|
| [README.md](./README.md) | Visão geral, stack, features | Primeira leitura |
| [GUIA_IMPLEMENTACAO.md](./GUIA_IMPLEMENTACAO.md) | Setup Expo, estrutura, libs | Ao implementar |
| [REQUISITOS_IOS.md](./REQUISITOS_IOS.md) | Node, Watchman, Expo CLI | Ao configurar |
| [CHECKLIST_APP_STORE.md](./CHECKLIST_APP_STORE.md) | Checklist publicação | Ao publicar |
| [RESUMO_IMPLEMENTACAO.md](./RESUMO_IMPLEMENTACAO.md) | Resumo da decisão técnica | Contexto |

### Referências Técnicas
| Documento | O Que Contém | Quando Usar |
|-----------|---------------|-------------|
| [DIFERENCAS_WEB_MOBILE.md](./DIFERENCAS_WEB_MOBILE.md) | Web vs Mobile comparado | Ao planejar features |
| [FEATURES_EXCLUSIVAS_IOS.md](./FEATURES_EXCLUSIVAS_IOS.md) | Features nativas planejadas | Ao implementar features |
| [ESTADO_ATUAL.md](./ESTADO_ATUAL.md) | Snapshot do projeto | Contexto do projeto |

## ⚡ Quick Start

### Setup Inicial (5 min)

```bash
# 1. Verificar ambiente
node --version
watchman --version

# 2. Iniciar projeto (se ainda não existir)
npx create-expo-app@latest fisioflow-mobile

# 3. Entrar na pasta
cd fisioflow-mobile

# 4. Iniciar servidor de desenvolvimento
npx expo start
```

### Testar no Simulador (2 min)

```bash
# Com o servidor rodando (npx expo start):
# Pressione 'i' para abrir no Simulador iOS
```

## 🎯 Funcionalidades iOS (Planejadas)

| Feature | Status | Lib Expo |
|---------|--------|----------|
| Face ID / Touch ID | ⏳ A implementar | `expo-local-authentication` |
| Push Notifications | ⏳ A implementar | `expo-notifications` |
| Câmera | ⏳ A implementar | `expo-camera` |
| Geolocalização | ⏳ A implementar | `expo-location` |
| Haptics | ⏳ A implementar | `expo-haptics` |
| Share Sheet | ⏳ A implementar | `expo-sharing` |
| Safe Area | ⏳ A implementar | `react-native-safe-area-context` |
| Navegação | ⏳ A implementar | `expo-router` |

## 🔗 Links Úteis

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)

## 💬 Dúvidas?

- 📧 Email: mobile@fisioflow.com
- 💬 Discord: [Servidor FisioFlow](https://discord.gg/fisioflow)
- 🐛 Issues: [GitHub Issues](https://github.com/fisioflow/fisioflow/issues)

---

**Última atualização**: 24 de Janeiro de 2026