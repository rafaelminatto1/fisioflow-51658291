/**
 * FisioFlow Service Worker
 * Progressive Web App (PWA) - Offline Support & Performance
 *
 * @version 2.0.0
 * @author Rafael Minatto
 */

// ============================================================================================
// CONFIGURAÇÃO
// ============================================================================================

const CONFIG = {
  // Nome do cache (versão)
  CACHE_VERSION: 'v2.3.0',
  CACHE_PREFIX: 'fisioflow',

  // URLs para cache imediato (core resources)
  CORE_CACHE: [
    '/',
    '/auth',
    '/manifest.json',
  ],

  // URLs para cache dinâmico (API routes)
  DYNAMIC_CACHE: [
    '/api/',
  ],

  // Estratégias de cache por padrão de URL
  strategies: {
    // Cache First para assets estáticos
    static: 'CacheFirst',

    // Network First para APIs
    api: 'NetworkFirst',

    // Stale While Revalidate para conteúdo que pode ser um pouco antigo
    content: 'StaleWhileRevalidate',

    // Network Only para operações críticas
    critical: 'NetworkOnly',
  },

  // Tempo de vida dos caches em segundos
  cacheTimes: {
    static: 7 * 24 * 60 * 60,      // 7 dias
    api: 5 * 60,                   // 5 minutos
    images: 30 * 24 * 60 * 60,     // 30 dias
    fonts: 365 * 24 * 60 * 60,     // 1 ano
  },

  // Limite de tamanho para caches (em MB)
  maxCacheSizes: {
    static: 50,    // 50MB
    api: 10,       // 10MB
    images: 100,   // 100MB
    fonts: 5,      // 5MB
  },
};

// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================

/**
 * Gera nome do cache baseado em tipo
 */
function getCacheName(type) {
  return `${CONFIG.CACHE_PREFIX}-${type}-${CONFIG.CACHE_VERSION}`;
}

/**
 * Determina a estratégia de cache baseado na URL
 */
function getStrategy(url) {
  const pathname = url.pathname;

  // Assets estáticos
  if (pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
    return CONFIG.strategies.static;
  }

  // Imagens
  if (pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    return CONFIG.strategies.content;
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    // Exercise image proxy - never cache, always go to network
    if (pathname.startsWith('/api/exercise-image/')) {
      return CONFIG.strategies.critical; // NetworkOnly
    }
    return CONFIG.strategies.api;
  }

  // Páginas HTML
  if (pathname.match(/\.html$/) || pathname.endsWith('/')) {
    return CONFIG.strategies.content;
  }

  // Default
  return CONFIG.strategies.content;
}

/**
 * Verifica se a requisição é navegational (página)
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

/**
 * Converte stream para texto
 */
async function streamToText(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}

// ============================================================================================
// CACHE STRATEGIES
// ============================================================================================

/**
 * Cache First: Tenta cache primeiro, se não existe vai para rede
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  // Tentar cache primeiro
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  // Cache miss - buscar na rede
  try {
    const response = await fetch(request);

    // Clonar response porque só pode ser consumida uma vez
    const clone = response.clone();

    // Salvar no cache
    if (response.ok) {
      await cache.put(request, clone);
    }

    return response;
  } catch (error) {
    // Offline e não está em cache
    console.error('[SW] CacheFirst error:', error);
    throw error;
  }
}

/**
 * Network First: Tenta rede primeiro, se falhar usa cache
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    // Tentar rede primeiro
    const response = await fetch(request);

    // Clonar response
    const clone = response.clone();

    // Salvar no cache apenas se for sucesso
    if (response.ok) {
      await cache.put(request, clone);
    }

    return response;
  } catch (error) {
    // Rede falhou - tentar cache
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Network failed, using cache:', request.url);
      return cached;
    }

    // Nem cache tem - offline
    console.error('[SW] NetworkFirst error - offline:', error);
    throw error;
  }
}

/**
 * Stale While Revalidate: Retorna cache imediatamente, atualiza em background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);

  // Tentar pegar do cache
  const cachedResponse = await cache.match(request);

  // Iniciar requisição de rede
  const networkPromise = fetch(request).then(response => {
    // Atualizar cache se resposta válida
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Se tiver cache, retorna ele e deixa a rede atualizar em background
  if (cachedResponse) {
    // Log apenas para debug
    networkPromise
      .then(() => console.log('[SW] Background update complete:', request.url))
      .catch((err) => console.warn('[SW] Background update failed:', err));

    return cachedResponse;
  }

  // Se não tiver cache, aguarda a rede
  return networkPromise;
}

/**
 * Network Only: Apenas rede, sem cache
 */
async function networkOnly(request) {
  return fetch(request);
}

// ============================================================================================
// INSTALLATION
// ============================================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    (async () => {
      // Criar caches
      const staticCache = await caches.open(getCacheName('static'));
      const fontsCache = await caches.open(getCacheName('fonts'));

      // Cache core resources
      try {
        await staticCache.addAll(CONFIG.CORE_CACHE);
        console.log('[SW] Core resources cached');
      } catch (error) {
        console.warn('[SW] Some core resources failed to cache:', error);
      }

      // Pré-carregar fontes principais
      try {
        const fonts = [
          '/fonts/inter-var.woff2',
        ].filter(url => self.registration.scope !== null); // Filtrar URLs relativas

        await fontsCache.addAll(fonts.filter(url => url));
        console.log('[SW] Fonts cached');
      } catch (error) {
        console.warn('[SW] Some fonts failed to cache:', error);
      }

      // Forçar ativação imediata
      self.skipWaiting();
      console.log('[SW] Service worker installed');
    })()
  );
});

// ============================================================================================
// ACTIVATION & CLEANUP
// ============================================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    (async () => {
      // Limpar caches antigos
      const cacheNames = await caches.keys();
      const cachesToDelete = cacheNames.filter(name => {
        return name.startsWith(CONFIG.CACHE_PREFIX) &&
          !name.includes(CONFIG.CACHE_VERSION);
      });

      await Promise.all(
        cachesToDelete.map(name => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );

      // Forçar controle de clientes imediatamente
      await self.clients.claim();
      console.log('[SW] Service worker activated and claimed clients');
    })()
  );
});

// ============================================================================================
// FETCH HANDLER
// ============================================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições para outros origins (incluindo Firebase APIs se necessário, mas geralmente queremos cachear assets locais)
  if (url.origin !== self.location.origin) {
    // Permitir cache de Google Fonts e outros CDNs se necessário no futuro
    return;
  }

  // Ignorar requisições de protocolo chrome-extension
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Ignorar requisições POST/PUT/DELETE (não cacheáveis)
  if (!['GET', 'HEAD'].includes(request.method)) {
    return;
  }

  // Determinar estratégia baseado na URL
  const strategy = getStrategy(url);

  // ============================================================================================
  // NAVIGATION REQUESTS (Páginas HTML)
  // ============================================================================================

  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          // Tentar rede primeiro para navegação
          const networkResponse = await fetch(request);

          // Salvar em cache
          const cache = await caches.open(getCacheName('static'));
          cache.put(request, networkResponse.clone());

          return networkResponse;
        } catch (error) {
          // Rede falhou - tentar cache
          const cache = await caches.open(getCacheName('static'));
          const cached = await cache.match(request);

          if (cached) {
            console.log('[SW] Navigation using cache:', request.url);
            return cached;
          }

          // Último recurso - offline page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }

          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        }
      })()
    );
    return;
  }

  // ============================================================================================
  // STATIC ASSETS (JS, CSS, FONTS)
  // ============================================================================================

  if (strategy === CONFIG.strategies.static) {
    const cacheType = url.pathname.match(/\.(woff2?|ttf|otf|eot)$/) ? 'fonts' : 'static';
    event.respondWith(cacheFirst(request, getCacheName(cacheType)));
    return;
  }

  // ============================================================================================
  // API REQUESTS
  // ============================================================================================

  if (strategy === CONFIG.strategies.api) {
    event.respondWith(networkFirst(request, getCacheName('api')));
    return;
  }

  // ============================================================================================
  // IMAGES & CONTENT
  // ============================================================================================

  if (strategy === CONFIG.strategies.content) {
    event.respondWith(staleWhileRevalidate(request, getCacheName('images')));
    return;
  }

  // ============================================================================================
  // DEFAULT
  // ============================================================================================

  event.respondWith(staleWhileRevalidate(request, getCacheName('static')));
});

// ============================================================================================
// BACKGROUND SYNC
// ============================================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }

  if (event.tag === 'sync-evolutions') {
    event.waitUntil(syncEvolutions());
  }
});

/**
 * Sincroniza agendamentos pendentes
 */
async function syncAppointments() {
  try {
    // Buscar dados armazenados no IndexedDB
    const pending = await getPendingData('appointments');

    for (const item of pending) {
      try {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          await removePendingData('appointments', item.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync appointment:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync appointments error:', error);
  }
}

/**
 * Sincroniza evoluções pendentes
 */
async function syncEvolutions() {
  try {
    const pending = await getPendingData('evolutions');

    for (const item of pending) {
      try {
        const response = await fetch('/api/evolutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          await removePendingData('evolutions', item.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync evolution:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync evolutions error:', error);
  }
}

/**
 * Busca dados pendentes do IndexedDB
 */
async function getPendingData(store) {
  // Implementação depende da estrutura do IndexedDB
  // Por ora retorna array vazio
  return [];
}

/**
 * Remove dado pendente do IndexedDB
 */
async function removePendingData(store, id) {
  // Implementação depende da estrutura do IndexedDB
}

// ============================================================================================
// PUSH NOTIFICATIONS
// ============================================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'FisioFlow',
    body: 'Você tem uma nova notificação',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: 'open',
        title: 'Abrir',
        icon: '/icon-192.png',
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: '/close.png',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// ============================================================================================
// MESSAGE HANDLING
// ============================================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

/**
 * Limpa todos os caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}

// ============================================================================================
// PERIODIC SYNC
// ============================================================================================

// Registrar periodic sync para atualização de dados
// (requer navegador com suporte)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'update-appointments') {
    event.waitUntil(
      caches.open(getCacheName('api')).then(cache => {
        return cache.add('/api/appointments');
      })
    );
  }
});

// ============================================================================================
// CLEANUP ON STORAGE QUOTA
// ============================================================================================

self.addEventListener('quotaexceeded', (event) => {
  console.warn('[SW] Storage quota exceeded, cleaning old caches...');

  event.waitUntil(
    (async () => {
      // Limpar cache de imagens primeiro (geralmente o maior)
      const cache = await caches.open(getCacheName('images'));
      const keys = await cache.keys();

      // Remover 20% dos itens mais antigos
      const toRemove = Math.floor(keys.length * 0.2);

      for (let i = 0; i < toRemove; i++) {
        await cache.delete(keys[i]);
      }

      console.log(`[SW] Removed ${toRemove} old items from images cache`);
    })()
  );
});
