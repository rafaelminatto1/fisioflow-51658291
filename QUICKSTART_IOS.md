# 🚀 Guia Rápida - Configuração iOS FisioFlow

## ✅ Arquivos Criados e Commitados no GitHub

Todos os arquivos já estão no repositório! Basta clonar no Mac e seguir os passos abaixo.

---

## 📥 Passo 1: Clonar no Mac

```bash
# Clonar o repositório
git clone https://github.com/rafaelminatto1/fisioflow-51658291.git
cd fisioflow-51658291
```

---

## 📦 Passo 2: Instalar Dependências

```bash
# Instalar dependências principais
pnpm install

# Instalar plugins Capacitor para iOS (HealthKit, Watch, Biometria)
pnpm add @capgo/capacitor-health
pnpm add @capgo/capacitor-watch
pnpm add @capgo/capacitor-native-biometric
pnpm add @capacitor/safe-area-insets
```

---

## 🔐 Passo 3: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com suas credenciais Supabase
# IMPORTANTE: Edite o arquivo .env e adicione:
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-CHAVE-ANON-KEY
```

---

## 🏗️ Passo 4: Build e Adicionar iOS

```bash
# Build do projeto
pnpm build

# Adicionar plataforma iOS
npx cap add ios

# Sincronizar com iOS
npx cap sync ios

# Abrir no Xcode
npx cap open ios
```

---

## ⚙️ Passo 5: Configurar no Xcode

### 5.1 Selecionar Team
- Abra o projeto no Xcode (já deve estar aberto)
- Selecione o projeto na sidebar (ícone azul "FisioFlow")
- Em "Signing & Capabilities", selecione seu Team
- O Xcode irá gerar os certificados automaticamente

### 5.2 Adicionar Capabilities

Clique em "+ Capability" e adicione:

1. **Push Notifications**
2. **HealthKit**
3. **Background Modes** → Selecione:
   - "Background fetch"
   - "Remote notifications"

### 5.3 Testar no Simulador

No Xcode:
- Selecione um simulador iPhone (ex: iPhone 15 Pro)
- Clique no botão ▶️ (Run) ou pressione ⌘R
- O app deve abrir e você pode testar!

---

## 🎯 Próximos Passos Depois de Testar

### Para FisioFlow Pro (Profissionais)

1. **Login com Email/Senha**
   - Use suas credenciais do Supabase
   - Primeiro login salvará credenciais para biometria

2. **Login Biométrico (Face ID/Touch ID)**
   - No próximo login, você pode usar biometria
   - Se aparecer a opção "Entrar com Face ID/Touch ID", clique nela

3. **Dashboard**
   - Veja seus pacientes do dia
   - Consulte sua agenda
   - Acesse estatísticas

### Para FisioFlow Patient

1. **Login**
   - Use suas credenciais de paciente

2. **Home**
   - Veja próximos agendamentos
   - Consulte exercícios do dia
   - Acompanhe seu progresso

---

## 🔧 Comandos Úteis

```bash
# Após fazer mudanças no código:
pnpm build && npx cap sync ios

# Rodar no simulador
npx cap run ios

# Rodar em dispositivo físico (conectado via USB)
npx cap run ios --target <device-name>

# Ver logs no Xcode
# No Xcode: View → Debug Area → Show Debug Area (⇧⌘Y)
```

---

## 📱 Testar Features Nativas

### HealthKit
```bash
# No simulador iOS:
Features → HealthKit → Add Data → Steps
```

### Push Notifications
```bash
# Use Supabase Dashboard:
Authentication → Providers → Push → Send Test
```

### Biometria
```bash
# Apenas funciona em dispositivo físico com Face ID/Touch ID
# No simulador, a opção não aparecerá
```

---

## 🐛 Problemas Comuns

### Erro: "No matching provisioning profiles"
```bash
# Conecte o dispositivo via USB
# No Xcode: Window → Devices and Simulators
# Selecione "Use for Development" e siga as instruções
```

### Erro: "Could not find module @capacitor/ios"
```bash
npx cap add ios
npx cap sync
```

### HealthKit não funciona
```bash
# Verifique no Xcode se HealthKit capability foi adicionada
# Verifique se entitlements estão corretos
# Build novamente: npx cap sync ios
```

---

## 📚 Documentação Completa

Para mais detalhes, consulte o arquivo `IOS_README.md` na raiz do projeto.

---

## ✅ Checklist de Verificação

- [ ] Projeto clonado com sucesso
- [ ] Dependências instaladas
- [ ] `.env` configurado com credenciais Supabase
- [ ] Build concluído sem erros
- [ ] Plataforma iOS adicionada
- [ ] Xcode abre corretamente
- [ ] Team selecionado
- [ ] Capabilities adicionadas (Push, HealthKit, Background Modes)
- [ ] App roda no simulador
- [ ] Login funcional
- [ ] Biometria funciona (em dispositivo físico)

---

## 🎉 Você Está Pronto!

Após seguir estes passos, você terá:
- ✅ Dois apps iOS funcionais (PRO e Patient)
- ✅ Autenticação com biometria
- ✅ Integração com HealthKit
- ✅ Preparado para adicionar Apple Watch

Quando estiver no Mac com o Xcode aberto, chame o **Claude Code** e diga:

```
"Preciso continuar com o desenvolvimento do iOS do FisioFlow. Siga o plano em /home/rafael/.claude/plans/refactored-marinating-charm.md"
```

Boa sorte! 🚀
