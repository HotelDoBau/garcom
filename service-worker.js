
const VERSAO_CACHE = "hotel-garcom-teste-v1";

self.addEventListener("install", evento => {
    self.skipWaiting();
});

self.addEventListener("activate", evento => {
    evento.waitUntil(
        (async () => {
            const cachesExistentes = await caches.keys();

            await Promise.all(
                cachesExistentes
                    .filter(nome => nome.startsWith("hotel-garcom-teste-"))
                    .filter(nome => nome !== VERSAO_CACHE)
                    .map(nome => caches.delete(nome))
            );

            await self.clients.claim();
        })()
    );
});

// Por segurança, as requisições continuam indo à rede.
// Não armazenamos páginas, autenticação ou dados dos pedidos.
self.addEventListener("fetch", evento => {
    if (evento.request.method !== "GET") {
        return;
    }
});
