# FisioFlow - Criar Development Build para iOS

## Por que Development Build?

O **Expo SDK 54** requer uma Development Build porque:
- ✅ Acesso completo a módulos nativos (PlatformConstants, etc.)
- ✅ Todas as features funcionam corretamente
- ✅ Hot reload durante desenvolvimento
- ❌ Expo Go não suporta SDK 54

---

## Passo 1: Criar conta Expo

```bash
# Instalar EAS CLI
pnpm add -g eas-cli

# Login na Expo
npx expo login
```

Abra o link no navegador para fazer login.

---

## Passo 2: Configurar projeto EAS

```bash
# Configurar EAS (primeira vez só)
eas build:configure
```

Isso cria/atualiza o arquivo `eas.json`.

---

## Passo 3: Criar Development Build

```bash
# Criar build de desenvolvimento para iOS (~15-20 min)
eas build --profile development --platform ios
```

Durante o build:
- O código é enviado para a nuvem Expo
- O app é compilado com todos os módulos nativos
- Você receberá um link quando terminar

---

## Passo 4: Instalar no iPhone

Quando o build terminar:

1. Abra o link enviado pelo EAS
2. Ou use:
   ```bash
   eas build:view
   ```
3. Faça download do arquivo `.ipa`
4. Instale via:
   - **TestFlight** (recomendado)
   - Ou **AltStore** (alternativa gratuita)

---

## Passo 5: Usar o Development Build

Depois de instalar:

1. Abra o app **FisioFlow** no seu iPhone
2. Escaneie o QR code do terminal
3. O app carregará com todas as features nativas! 🎉

---

## Comandos Úteis

### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento
NODE_OPTIONS="--no-experimental-strip-types" npx expo start

# Limpar cache e reiniciar
npx expo start --clear

# Abrir no simulator (se tiver Mac)
npx expo start --ios
```

### Builds
```bash
# Development build (para testes)
eas build --profile development --platform ios

# Preview build (para beta testers)
eas build --profile preview --platform ios

# Production build (para App Store)
eas build --profile production --platform ios

# Ver status dos builds
eas build:list

# Ver detalhes de um build específico
eas build:view [BUILD_ID]
```

---

## Solução de Problemas

### "Build failed"
- Verifique o log de erro no dashboard Expo: https://expo.dev
- Certifique-se que o `eas.json` está correto

### "Cannot install on iPhone"
- Use TestFlight se disponível
- Ou use AltStore (https://altstore.io/)

### "App crashes on opening"
- Verifique os logs no Expo dashboard
- Pode ser problema de certificados/provisioning

---

## Configuração do eas.json

O arquivo já está configurado com:
- **Development**: Build interno para desenvolvimento
- **Preview**: Build para beta testers
- **Production**: Build para App Store

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "dev-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "dev-medium"
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      }
    }
  }
}
```

---

## Tempo Estimado

| Operação | Tempo |
|----------|-------|
| Configurar EAS | 5 min |
| Development Build | 15-20 min |
| Instalar no iPhone | 5 min |
| **TOTAL** | **~30 min** |

---

## Próximos Passos

Depois de ter o Development Build instalado:

1. ✅ Testar todas as features nativas
2. ✅ Desenvolver o app com hot reload
3. ✅ Quando pronto, fazer build de produção
4. ✅ Submeter para App Store

---

**Precisa de ajuda?**
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Guide](https://docs.expo.dev/build/introduction)
- [Expo Discord](https://discord.gg/expo)
