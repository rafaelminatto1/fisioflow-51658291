# Content Security Policy (CSP) - Firebase Hosting

A política de segurança de conteúdo está configurada em `firebase.json` sob `hosting.headers`. Este documento descreve as diretivas e os domínios permitidos.

## Diretivas Principais

| Diretiva | Propósito |
|----------|-----------|
| `script-src` | Scripts: app, Google APIs, Firebase, Google Tag Manager (GA4) |
| `connect-src` | Requisições: Firebase, Cloud Functions, GA4, Sentry |
| `style-src` | Estilos: app, Google Fonts |
| `img-src` | Imagens: app, data URIs, blob, HTTPS |
| `frame-src` | Iframes: app, YouTube |
| `font-src` | Fontes: app, Google Fonts |

## Domínios de Terceiros Incluídos

- **Google Analytics**: `https://www.googletagmanager.com`
- **Sentry**: `https://*.ingest.sentry.io`, `https://*.sentry.io`
- **Firebase**: `https://*.firebaseio.com`, `https://*.firebasedatabase.app`, `https://*.googleapis.com`
- **Cloud Functions**: `https://*.cloudfunctions.net`

## Adicionando Novos Domínios

Ao integrar um novo serviço (analytics, chat, etc.):

1. Identifique as diretivas afetadas (script-src, connect-src, img-src, etc.)
2. Adicione o domínio específico em `firebase.json`
3. Atualize este documento

## Debug Agent (Desenvolvimento)

O utilitário `@/lib/debug/agentIngest` envia logs para `http://127.0.0.1:7242` apenas quando:
- `import.meta.env.DEV` é true
- `VITE_DEBUG_AGENT_INGEST=true` no `.env.local`

Em produção, essas requisições não são feitas. O domínio localhost foi removido do CSP por segurança.
