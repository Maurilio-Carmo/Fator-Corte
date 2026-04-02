// sw.js
/**
 * Service Worker — Fator de Corte
 *
 * Estratégia: cache-first para todos os assets estáticos.
 * Ao instalar, pré-cacheia todos os arquivos listados em ASSETS.
 * Ao ativar, remove caches de versões anteriores.
 *
 * Para publicar uma atualização: incremente CACHE_VERSION.
 */

const CACHE_VERSION = 'v1.0.8';
const CACHE_NAME    = `fator-corte-${CACHE_VERSION}`;

/** Todos os assets que devem funcionar offline. */
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/index.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/theme.css',
  './src/app.js',
  './src/controllers/AppController.js',
  './src/models/Carcass.js',
  './src/models/Cut.js',
  './src/services/CalculationService.js',
  './src/views/AppView.js',
  './src/utils/formatters.js',
  './components/header.html',
  './components/carcass-form.html',
  './components/cuts-list.html',
  './components/summary-cards.html',
  './components/cuts-table.html',
  './components/footer.html',
  './data/cuts.json',
  './icons/icon.svg',
];

/* ---- Install: pré-cacheia todos os assets ---- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Ativa imediatamente sem esperar o SW anterior ser descartado
  self.skipWaiting();
});

/* ---- Activate: remove caches antigos ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Assume controle de clientes já abertos
  self.clients.claim();
});

/* ---- Fetch: cache-first, com fallback para rede ---- */
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET e chrome-extension
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cacheia apenas respostas válidas
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
