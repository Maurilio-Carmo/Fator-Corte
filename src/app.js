// src/app.js
// Ponto de entrada: carrega os componentes HTML, monta o layout e inicializa o MVC.
import { AppController } from './controllers/AppController.js';
import { PwaManager }    from './services/PwaManager.js';
import { APP_VERSION }   from '../version.js';

console.log(`%c🥩 Fator de Corte %c${APP_VERSION}`, 'color:#c17f24;font-weight:bold;font-size:14px', 'color:#888;font-size:12px');

// Criado o quanto antes para capturar o evento beforeinstallprompt.
const pwaManager = new PwaManager(APP_VERSION);

// Barra de progresso real do boot: avança conforme cada fetch resolve
// (não é decorativa — reflete o carregamento de fato).
const progressEl = document.getElementById('boot-progress');
const BOOT_STEPS = 7; // 6 componentes HTML + 1 JSON
let bootLoaded = 0;

function tickProgress() {
  bootLoaded++;
  if (progressEl) progressEl.style.transform = `scaleX(${bootLoaded / BOOT_STEPS})`;
}

async function fetchHTML(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar componente: ${path}`);
  const text = await res.text();
  tickProgress();
  return text;
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar dados: ${path}`);
  const json = await res.json();
  tickProgress();
  return json;
}

function hideSkeleton() {
  if (progressEl) {
    progressEl.classList.add('done');
    progressEl.addEventListener('transitionend', () => progressEl.remove(), { once: true });
  }
  const skeleton = document.getElementById('app-skeleton');
  if (!skeleton) return;
  skeleton.classList.add('skeleton-exit');
  skeleton.addEventListener('transitionend', () => skeleton.remove(), { once: true });
}

async function bootstrap() {
  console.log('%c[App] Carregando componentes...', 'color:#888');

  // Todos os componentes e dados são buscados em paralelo — reduz o tempo
  // total de carregamento (e, com isso, o tempo em que o skeleton fica visível).
  const [headerHTML, formHTML, cutsListHTML, summaryHTML, tableHTML, footerHTML, cutsByType] = await Promise.all([
    fetchHTML('components/header.html'),
    fetchHTML('components/carcass-form.html'),
    fetchHTML('components/cuts-list.html'),
    fetchHTML('components/summary-cards.html'),
    fetchHTML('components/cuts-table.html'),
    fetchHTML('components/footer.html'),
    fetchJSON('data/cuts.json'),
  ]);

  const app = document.getElementById('app');
  app.className = 'page-wrapper';

  app.insertAdjacentHTML('beforeend', headerHTML);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.id = 'main';
  main.setAttribute('role', 'main');

  const colLeft = document.createElement('div');
  colLeft.className = 'column-left';
  colLeft.insertAdjacentHTML('beforeend', formHTML);
  colLeft.insertAdjacentHTML('beforeend', cutsListHTML);

  const colRight = document.createElement('div');
  colRight.className = 'column-right';
  colRight.insertAdjacentHTML('beforeend', summaryHTML);

  main.appendChild(colLeft);
  main.appendChild(colRight);
  main.insertAdjacentHTML('beforeend', tableHTML);

  app.appendChild(main);
  app.insertAdjacentHTML('beforeend', footerHTML);

  const controller = new AppController(cutsByType, pwaManager);
  controller.init();

  // Move os elementos position:fixed para o body, evitando que o stacking
  // context criado pela animação (opacity/transform em #app) quebre o
  // posicionamento do drawer e do overlay.
  ['drawer-overlay', 'settings-panel'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) document.body.appendChild(el);
  });

  // Cross-fade: skeleton sai enquanto o app real entra.
  hideSkeleton();
  requestAnimationFrame(() => app.classList.add('page-ready'));

  console.log('%c[App] Pronto ✓', 'color:#4caf50;font-weight:bold');
}

bootstrap().catch((err) => {
  console.error('Falha no bootstrap:', err);
  hideSkeleton();
  document.getElementById('app').textContent = 'Erro ao carregar a aplicação.';
  document.getElementById('app').classList.add('page-ready');
});

pwaManager.registerServiceWorker();
