# Guia de Início Rápido

## ⚡ Setup em 5 Minutos

### 1. Pré-requisitos

```bash
# Verifique se tem Node.js 18+
node --version  # deve ser v18+

# Instale pnpm se não tiver
npm install -g pnpm@9.15.0
```

### 2. Clone e Instale

```bash
git clone https://github.com/fisioflow/fisioflow.git
cd fisioflow
pnpm install
```

### 3. Configure o Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com) e crie um projeto
2. Vá em **Configurações do projeto** → **Seus apps** e adicione um app Web
3. Copie o objeto `firebaseConfig` e crie o arquivo `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### 4. Firestore e Regras

1. No console Firebase, crie o banco Firestore (modo Produção ou Teste)
2. Configure as **Regras de segurança** conforme o arquivo `firestore.rules` do projeto
3. (Opcional) Para desenvolvimento local: `firebase emulators:start --only auth,firestore,storage`

### 5. Inicie o Servidor

```bash
pnpm dev
```

Acesse: [http://localhost:8080](http://localhost:8080)

## 👤 Criar Usuário Admin

No Firebase Auth, crie um usuário (email/senha). Em seguida, no Firestore, crie um documento na coleção `profiles` com o mesmo `id` (uid do Auth), campos `email`, `full_name`, `role: 'admin'` e `organization_id` (crie uma organização primeiro na coleção `organizations`).

## 🎉 Pronto!

Você está com o FisioFlow rodando localmente!

## 📚 Próximos Passos

- [Estrutura do Projeto](../04-estrutura-projeto.md) - Entenda a organização
- [Componentes UI](../08-componentes-ui.md) - Aprenda a usar os componentes
- [Guia de Contribuição](../12-guia-contribuicao.md) - Como contribuir

## ❓ Problemas Comuns

### "Module not found"
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Porta 8080 em uso
```bash
pnpm dev --port 3000
```

### Erro de CORS no Firebase
Verifique se as credenciais no `.env` estão corretas e se o domínio está em Authorized domains no Firebase Auth.

## 🔗 Links Úteis

- [Documentação Firebase](https://firebase.google.com/docs)
- [Documentação Vite](https://vitejs.dev/)
- [Documentação React](https://react.dev/)
