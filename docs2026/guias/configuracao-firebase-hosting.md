# Configuração Firebase Hosting e Deploy (Firebase + GCP)

O FisioFlow usa **Firebase Hosting** para o frontend e **Cloud Functions** para o backend. Não utilizamos Vercel nem Netlify.

## 1. Pré-requisitos

- Projeto Firebase criado ([Configuração Firebase](./configuracao-firebase.md))
- Firebase CLI: `npm install -g firebase-tools` e `firebase login`

## 2. Inicializar Hosting no projeto

```bash
firebase init hosting
```

- Escolha o projeto Firebase.
- **Public directory:** `dist` (saída do Vite).
- **Single-page app:** Sim (rewrite tudo para `/index.html`).
- **GitHub Actions:** opcional (podemos usar Cloud Build em vez disso).

## 3. firebase.json

Exemplo mínimo para SPA + headers de segurança:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "max-age=31536000,immutable" }]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "DENY" }
        ]
      }
    ]
  }
}
```

## 4. Build e deploy

```bash
pnpm build
firebase deploy --only hosting
```

URL de produção: `https://SEU_PROJECT_ID.web.app` (ou domínio customizado).

## 5. Domínio customizado

1. Firebase Console → Hosting → **Adicionar domínio personalizado**.
2. Siga as instruções (registro DNS: A/CNAME ou TXT conforme indicado).
3. SSL é gerenciado automaticamente pelo Firebase.

## 6. Variáveis de ambiente (build)

As variáveis `VITE_*` precisam estar disponíveis no **momento do build**. Em CI (Cloud Build ou GitHub Actions), use secrets. Localmente, use `.env.production` (não commitar valores sensíveis).

## 7. CI/CD

- **Cloud Build:** veja [11. Deploy e Produção](../11-deploy-producao.md) e [PLANO_FIREBASE_GCP.md](../PLANO_FIREBASE_GCP.md).
- **GitHub Actions:** use a action `w9jds/firebase-action` ou `FirebaseExtended/action-hosting-deploy` com `FIREBASE_TOKEN` em secrets.

## 8. Rollback

Firebase Console → Hosting → Histórico de versões → **Reverter** para uma versão anterior.

## 🔗 Recursos

- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Plano Firebase + GCP](../PLANO_FIREBASE_GCP.md)
- [Deploy e Produção](../11-deploy-producao.md)
