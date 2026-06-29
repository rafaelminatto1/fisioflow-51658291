import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any[];
};

// FisioFlow Service Worker - Modernizado com Workbox
// Responsável por Caching (PWA), Push Notifications e Background Sync

cleanupOutdatedCaches();

const APP_CHUNKS_CACHE = "app-chunks";
const LEGACY_CHUNKS_CACHE = "app-chunks";
const APP_VERSION_CACHE = "app-version";

function isCacheableAssetResponse(request: Request, response: Response): boolean {
  if (response.status !== 200) return false;

  const url = new URL(request.url);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (url.pathname.endsWith(".js")) {
    return (
      contentType.includes("javascript") ||
      contentType.includes("ecmascript") ||
      contentType.includes("application/wasm")
    );
  }

  if (url.pathname.endsWith(".css")) {
    return contentType.includes("text/css");
  }

  return true;
}

// Precaching automático de todos os assets do build (injetado pelo Vite PWA)
precacheAndRoute(self.__WB_MANIFEST);

// ============================================================================
// SHELL FALLBACK — toda navegação SPA tenta a rede; se falhar, serve o
// /index.html do precache. Sem isso, F5 sem rede dá ERR_INTERNET_DISCONNECTED.
//
// Não usamos createHandlerBoundToURL("/index.html") direto porque o Cloudflare
// Workers Assets retorna 307 para /index.html — fazemos o fallback manual via
// matchPrecache() que lida com o revision do Workbox.
// ============================================================================
async function navigationHandler(): Promise<Response> {
  try {
    const networkResponse = await fetch("/", { cache: "no-store" });
    if (networkResponse.ok) return networkResponse;
    throw new Error(`Network responded ${networkResponse.status}`);
  } catch {
    const cached = await matchPrecache("/index.html");
    if (cached) return cached;
    // Último recurso — página offline estática (precached)
    const offlinePage = await matchPrecache("/offline.html");
    if (offlinePage) return offlinePage;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [
      /^\/api\//,
      /^\/assets\//,
      /^\/icons\//,
      /\.(?:js|css|json|map|png|jpg|jpeg|svg|webp|avif|woff2?|ico)$/,
    ],
  }),
);

// ============================================================================
// RUNTIME CACHING — chunks JS/CSS versionados tentam rede primeiro para evitar
// HTML antigo/corrompido salvo como módulo JS após deploys. O cache só é usado
// quando a rede falha e nunca armazena respostas com MIME incompatível.
// ============================================================================
registerRoute(
  ({ url }) => url.origin === self.location.origin && /^\/assets\/.+\.(js|css)$/.test(url.pathname),
  new NetworkFirst({
    cacheName: APP_CHUNKS_CACHE,
    networkTimeoutSeconds: 3,
    plugins: [
      {
        cacheWillUpdate: async ({ request, response }) =>
          isCacheableAssetResponse(request, response) ? response : null,
      },
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/mediapipe/wasm/"),
  new StaleWhileRevalidate({
    cacheName: "mediapipe-wasm",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Imagens / ícones / fontes — StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === "image" || request.destination === "font",
  new StaleWhileRevalidate({
    cacheName: "app-static",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// ============================================================================
// VERSIONAMENTO — detecta nova versão e limpa caches antigos via Service Worker.
// Garante que após um deploy, os usuários não ficam com assets stale.
// ============================================================================
async function clearOldVersionCaches(): Promise<void> {
  try {
    const cache = await caches.open(APP_VERSION_CACHE);
    // Cache API exposes match(), not get() — using get() threw
    // "TypeError: e.get is not a function", silently disabling deploy cleanup.
    const stored = await cache.match("__app_manifest_revision__");
    // Busca a versão atual do manifest.webmanifest (gerado pelo Vite com hash)
    let current = "unknown";
    try {
      const resp = await fetch("/manifest.json", { cache: "no-store" });
      if (resp.ok) {
        const json = await resp.json();
        current = json.version || json.build || new URL(resp.url).pathname;
      }
    } catch { /* fallback abaixo */ }
    if (current === "unknown") {
      current = Date.now().toString(); // Força limpeza se não conseguiu ler
    }
    if (stored) {
      const prev = await stored.text();
      if (prev && prev !== current) {
        console.log(`[SW] Deploy detectado: ${prev} -> ${current}. Limpando caches antigos...`);
        const names = await caches.keys();
        await Promise.all(
          names.filter(n => n !== APP_CHUNKS_CACHE && n !== APP_VERSION_CACHE && !n.startsWith("workbox-"))
            .map(n => caches.delete(n))
        );
        await caches.delete(APP_CHUNKS_CACHE);
      }
    }
    await cache.put("__app_manifest_revision__", new Response(current));
  } catch (err) {
    console.warn("[SW] Verificação de versão falhou:", err);
  }
}

self.skipWaiting();
clientsClaim();

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([caches.delete(LEGACY_CHUNKS_CACHE), clearOldVersionCaches()]));
});

// Listener para Push Notifications (Backend -> SW)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || "Você tem uma nova notificação no FisioFlow.",
      icon: "/icons/icon-192x192.svg",
      badge: "/icons/badge-72x72.svg",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/agenda",
      },
      requireInteraction: data.requireInteraction || false,
      tag: data.tag || "general",
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "FisioFlow Notificação", options),
    );
  } catch (e) {
    console.error("[SW] Erro ao processar Push Notification:", e);
    event.waitUntil(
      self.registration.showNotification("FisioFlow", {
        body: event.data.text(),
        icon: "/icons/icon-192x192.svg",
      }),
    );
  }
});

// Listener para clique na Notificação
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/agenda";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Se já houver uma aba aberta, foca nela e navega
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Se não houver, abre uma nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

// ============================================================================
// BACKGROUND SYNC — drains IndexedDB offline queue when connectivity returns
// ============================================================================

self.addEventListener("sync", (event: any) => {
  if (event.tag === "fisioflow-sync") {
    event.waitUntil(drainOfflineQueue());
  }
});

async function drainOfflineQueue() {
  const DB_NAME = "FisioFlowOffline";
  const STORE_NAME = "offline_actions";
  const API_BASE_URL = "https://fisioflow-api.rafalegollas.workers.dev";
  // Same-origin proxy (asset worker) — the session cookie is first-party to this
  // origin, so a relative path ensures it is sent with the request.
  const NEON_AUTH_URL = "/__neon-auth";

  // 1. Tenta obter um JWT fresco via Neon direct session fetch
  let token: string | null = null;
  try {
    const authRes = await fetch(`${NEON_AUTH_URL}/get-session`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    token = authRes.headers.get("set-auth-jwt");
  } catch (err) {
    console.error("[SW] Erro ao tentar obter token para Background Sync:", err);
  }

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2); // Versão 2 conforme useOfflineStorage
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const actions: any[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });

  // Filtra apenas pendentes (synced === false) e sem conflito
  const pending = actions.filter((a) => !a.synced && !a.conflictedAt && a.retryCount < 3);
  if (!pending.length) return;

  for (const op of pending) {
    let url = op.url;
    let method = op.method || "POST";
    const body = op.payload;

    // Mapeamento legado/específico se a URL não estiver no registro
    if (!url) {
      if (op.action === "AUTOSAVE_EVOLUTION") {
        url = "/api/sessions/autosave";
        method = "POST";
      } else {
        console.warn("[SW] Ação sem URL definida e sem mapeamento:", op.action);
        continue;
      }
    }

    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(fullUrl, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          // No sistema novo, marcamos como synced ou deletamos?
          // offlineSync.ts deleta após sucesso.
          tx.objectStore(STORE_NAME).delete(op.id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } else if (res.status === 409) {
        // Conflito: marca no registro para resolução manual
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).put({
            ...op,
            conflictedAt: Date.now(),
            lastError: "Conflict (409) detected during Background Sync",
          });
          tx.oncomplete = () => resolve();
        });
      } else if (res.status >= 400 && res.status < 500) {
        // Erro terminal do cliente: remove da fila
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).delete(op.id);
          tx.oncomplete = () => resolve();
        });
      }
      // 5xx ou erro de rede: mantém como pendente para o próximo sync
    } catch (err) {
      console.error("[SW] Erro ao sincronizar ação:", op.id, err);
    }
  }
}

// ============================================================================
// PERIODIC BACKGROUND SYNC (V5 PRO)
// ============================================================================

self.addEventListener("periodicsync", (event: any) => {
  if (event.tag === "wiki-sync") {
    console.log("[SW] Iniciando sincronização periódica da Wiki...");
    event.waitUntil(syncWikiData());
  }
});

async function syncWikiData() {
  try {
    // Busca a lista de artigos da Wiki para garantir cache offline
    const response = await fetch("/api/wiki/sync");
    if (!response.ok) return;

    const cache = await caches.open("wiki-content-v1");
    await cache.put("/api/wiki/sync", response);

    console.log("[SW] Wiki sincronizada com sucesso.");
  } catch (error) {
    console.error("[SW] Erro na sincronização periódica:", error);
  }
}
