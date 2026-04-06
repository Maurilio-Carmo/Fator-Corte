// sw.js
/**
 * Service Worker — Fator de Corte
 *
 * Estratégia: cache-first para todos os assets estáticos.
 * Ao instalar, pré-cacheia todos os arquivos listados em ASSETS.
 * Ao ativar, remove caches de versões anteriores.
 *
 */

import { APP_VERSION } from './version.js';
const CACHE_NAME  = `fator-corte-${APP_VERSION}`;

/** Todos os assets que devem funcionar offline. */
const ASSETS = [
  './',
  './index.html',
  './version.js',
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
  // Não chama skipWaiting() aqui — aguarda o usuário confirmar a atualização.
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
  self.clients.claim();
});

/* ---- Message: usuário clicou em "Atualizar" ---- */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ---- Fetch: cache-first, com fallback para rede ---- */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});