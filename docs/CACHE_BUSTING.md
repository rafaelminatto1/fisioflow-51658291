# Cache Busting - FisioFlow

## Visão Geral

Este sistema garante que **novos builds sejam automaticamente atualizados em todos os dispositivos e navegadores** sem necessidade de limpar o cache manualmente.

## Como Funciona

### 1. Versionamento Dinâmico

Cada build gera um **timestamp único** que é usado em múltiplas camadas:

```typescript
// vite.config.ts
const buildTime = Date.now().toString();  // Ex: "1768353201263"
const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || buildTime;
```

### 2. Camadas de Cache Busting

#### HTML (index.html)
```html
<meta name="app-version" content="1768353201263" />
<meta name="build-time" content="1768353201263" />
```

```javascript
window.__APP_VERSION__ = "1768353201263";
window.__BUILD_TIME__ = "1768353201263";
window.__CACHE_BUSTER__ = "1768353201263";
```

#### Service Worker (sw.js)
```javascript
cacheId: `fisioflow-v1768353201263`
```

#### Assets com Hash
```
index-CVmWRsdW.js  (hash único por arquivo)
vendor-BX-SStCl.js
```

### 3. Detecção de Atualização

```typescript
// src/hooks/useServiceWorkerUpdate.ts
useServiceWorkerUpdate();
```

- Verifica atualizações a cada 2 minutos
- Detecta quando novo SW está instalado
- Mostra toast amigável com opção de atualizar

### 4. Limpeza Automática de Cache

```javascript
// index.html
if (lastVersion && lastVersion !== currentVersion) {
  sessionStorage.clear();  // Limpa cache de sessão
}
localStorage.setItem('app_version', currentVersion);
```

## Arquivos Envolvidos

| Arquivo | Função |
|---------|--------|
| `vite.config.ts` | Plugin HTML, cache ID do Workbox |
| `index.html` | Meta tags, script inline com versão |
| `src/main.tsx` | Handler do SW, SKIP_WAITING |
| `src/App.tsx` | Integração do hook |
| `src/hooks/useServiceWorkerUpdate.ts` | Detecção e notificação de updates |

## Testando

### Verificar Versão Atual

```javascript
// No console do navegador
console.log(window.__APP_VERSION__);
console.log(window.__BUILD_TIME__);
console.log(localStorage.getItem('app_version'));
```

### Simular Nova Versão

```javascript
// No console do navegador
localStorage.setItem('app_version', 'old-version');
window.location.reload();
// O sessionStorage será limpo automaticamente
```

## Deploy

### Vercel (Produção)
- `VERCEL_GIT_COMMIT_SHA` é usado como versão
- Cada deploy tem versão única

### Local/Dev
- Timestamp atual é usado como versão
- Cada build tem versão única

## Troubleshooting

### Usuário não recebe atualização

1. Verificar se o SW está registrado:
```javascript
navigator.serviceWorker.getRegistrations();
```

2. Forçar verificação manual:
```javascript
import { checkForUpdate } from '@/hooks/useServiceWorkerUpdate';
await checkForUpdate();
```

3. Limpar todos os caches (último recurso):
```javascript
caches.keys().then(names => names.forEach(name => caches.delete(name)));
```

### Erro "URI malformed" no build

Verificar se não há caracteres inválidos no `index.html`. O plugin `htmlPlugin` substitui placeholders antes do Rollup processar o HTML.

## Performance Impact

- **Build time**: +0.5s (geração de timestamps)
- **Bundle size**: +200 bytes (variáveis globais)
- **Runtime overhead**: desprezível

## Referências

- [Vite PWA Documentation](https://vite-pwa-org.netlify.app/)
- [Workbox Strategies](https://developer.chrome.com/docs/workbox/)
- [Service Worker Update Flow](https://web.dev/service-worker-lifecycle/)
