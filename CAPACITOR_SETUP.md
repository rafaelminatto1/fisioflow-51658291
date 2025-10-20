# 📱 Setup do App Nativo - FisioFlow

## ✅ Configuração Inicial Completa

O Capacitor foi configurado no projeto! Agora você pode rodar o FisioFlow como um app nativo em iOS e Android.

## 🚀 Próximos Passos

### 1. Exportar para seu GitHub
Clique no botão **"Export to Github"** no Lovable para transferir o projeto.

### 2. Clonar o repositório
```bash
git clone [seu-repositorio]
cd fisioflow
```

### 3. Instalar dependências
```bash
npm install
```

### 4. Adicionar plataformas nativas

**Para Android:**
```bash
npx cap add android
npx cap update android
```

**Para iOS (apenas em Mac com Xcode):**
```bash
npx cap add ios
npx cap update ios
```

### 5. Build do projeto
```bash
npm run build
```

### 6. Sincronizar com plataformas nativas
```bash
npx cap sync
```

### 7. Rodar no dispositivo/emulador

**Android (precisa ter Android Studio instalado):**
```bash
npx cap run android
```

**iOS (precisa ter Xcode instalado em Mac):**
```bash
npx cap run ios
```

## 🔄 Workflow de Desenvolvimento

Sempre que fizer alterações no código:

1. **Git pull** do projeto atualizado
2. Rodar `npm install` (se houver novas dependências)
3. Rodar `npm run build`
4. Rodar `npx cap sync` para sincronizar com as plataformas nativas
5. Testar no emulador/dispositivo

## 📝 Configuração Atual

- **App ID**: `app.lovable.5aa177ed5a714e0d9acbd82af5218253`
- **App Name**: FisioFlow
- **Hot Reload**: Habilitado (aponta para sandbox do Lovable)
- **Splash Screen**: Configurado com cor azul (#0EA5E9)

## 🎯 Recursos Nativos Disponíveis

Com o Capacitor, você tem acesso completo a:
- 📸 Câmera e galeria
- 📍 Geolocalização
- 🔔 Push notifications
- 💾 Armazenamento local
- 🔐 Biometria (Touch ID/Face ID)
- 📱 Sensores do dispositivo
- E muito mais!

## 🛠 Ferramentas Necessárias

### Para Android:
- [Android Studio](https://developer.android.com/studio)
- Java Development Kit (JDK)

### Para iOS:
- Mac com macOS
- [Xcode](https://developer.apple.com/xcode/)
- Conta Apple Developer (para publicar)

## 📚 Documentação

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Lovable Mobile Guide](https://docs.lovable.dev/features/mobile)

## 🆘 Problemas Comuns

**"Command not found: cap"**
→ Execute `npm install` primeiro

**Build falha no Android**
→ Abra o projeto no Android Studio e deixe sincronizar

**Build falha no iOS**
→ Abra o projeto no Xcode e configure o Team/Bundle ID

---

**Status**: ✅ Capacitor configurado e pronto para uso
**Próximo passo**: Exportar para GitHub e seguir os passos acima
