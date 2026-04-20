import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: any[];
};

// FisioFlow Service Worker - Modernizado com Workbox
// Responsável por Caching (PWA), Push Notifications e Background Sync

cleanupOutdatedCaches();

// Precaching automático de todos os assets do build (injetado pelo Vite PWA)
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

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
			self.registration.showNotification(
				data.title || "FisioFlow Notificação",
				options,
			),
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
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((windowClients) => {
				// Se já houver uma aba aberta, foca nela e navega
				for (let i = 0; i < windowClients.length; i++) {
					const client = windowClients[i];
					if (
						client.url.includes(self.registration.scope) &&
						"focus" in client
					) {
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
