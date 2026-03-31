// src/app.js
// Ponto de entrada: carrega os componentes HTML, monta o layout e inicializa o MVC.
import { AppController } from './controllers/AppController.js';

// Versão da aplicação — deve corresponder ao CACHE_VERSION em sw.js
const APP_VERSION = 'v1.0.6';

// Estado PWA compartilhado com o AppController via window.__pwa
window.__pwa = { version: APP_VERSION, installPrompt: null, hasUpdate: false };

// Captura o prompt de instalação PWA o mais cedo possível
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__pwa.installPrompt = e;
  window.dispatchEvent(new Event('pwa-installable'));
});

async function fetchHTML(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar componente: ${path}`);
  return res.text();
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar dados: ${path}`);
  return res.json();
}

async function bootstrap() {
  const app = document.getElementById('app');
  app.className = 'page-wrapper';

  app.insertAdjacentHTML('beforeend', await fetchHTML('components/header.html'));

  const main = document.createElement('main');
  main.className = 'main-content';
  main.id = 'main';
  main.setAttribute('role', 'main');

  const colLeft = document.createElement('div');
  colLeft.className = 'column-left';
  colLeft.insertAdjacentHTML('beforeend', await fetchHTML('components/carcass-form.html'));
  colLeft.insertAdjacentHTML('beforeend', await fetchHTML('components/cuts-list.html'));

  const colRight = document.createElement('div');
  colRight.className = 'column-right';
  colRight.insertAdjacentHTML('beforeend', await fetchHTML('components/summary-cards.html'));

  main.appendChild(colLeft);
  main.appendChild(colRight);
  main.insertAdjacentHTML('beforeend', await fetchHTML('components/cuts-table.html'));

  app.appendChild(main);
  app.insertAdjacentHTML('beforeend', await fetchHTML('components/footer.html'));

  const cutsByType = await fetchJSON('data/cuts.json');
  const controller = new AppController(cutsByType);
  controller.init();
}

bootstrap().catch((err) => {
  console.error('Falha no bootstrap:', err);
  document.getElementById('app').textContent = 'Erro ao carregar a aplicação.';
});

// Registro do Service Worker e detecção de atualizações
if ('serviceWorker' in navigator) {
  // Flag: havia controller antes? Se sim, um controllerchange posterior = update real
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // SW já aguardando (pode ocorrer se skipWaiting não estiver ativo)
    if (reg.waiting) {
      window.__pwa.hasUpdate = true;
      window.dispatchEvent(new Event('pwa-update-ready'));
    }
    // Nova versão baixando enquanto o app está aberto
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          window.__pwa.hasUpdate = true;
          window.dispatchEvent(new Event('pwa-update-ready'));
        }
      });
    });
  }).catch((err) => {
    console.warn('Service Worker não registrado:', err);
  });

  // Nova versão assumiu o controle (após skipWaiting + clients.claim)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) {
      window.__pwa.hasUpdate = true;
      window.dispatchEvent(new Event('pwa-update-ready'));
    }
  });
}
