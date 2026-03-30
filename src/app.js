// src/app.js
/**
 * app.js — Entry point. Loads HTML components, builds layout, bootstraps MVC.
 */
import { AppController } from './controllers/AppController.js';

async function fetchHTML(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load component: ${path}`);
  return res.text();
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load data: ${path}`);
  return res.json();
}

async function bootstrap() {
  const app = document.getElementById('app');
  app.className = 'page-wrapper';

  // ---- Header ----
  app.insertAdjacentHTML('beforeend', await fetchHTML('components/header.html'));

  // ---- Main ----
  const main = document.createElement('main');
  main.className = 'main-content';
  main.id = 'main';
  main.setAttribute('role', 'main');

  const twoCol = document.createElement('div');
  twoCol.className = 'two-column-layout';

  const colLeft = document.createElement('div');
  colLeft.className = 'column-left';
  colLeft.insertAdjacentHTML('beforeend', await fetchHTML('components/carcass-form.html'));
  colLeft.insertAdjacentHTML('beforeend', await fetchHTML('components/cuts-list.html'));

  const colRight = document.createElement('div');
  colRight.className = 'column-right';
  colRight.insertAdjacentHTML('beforeend', await fetchHTML('components/summary-cards.html'));

  twoCol.appendChild(colLeft);
  twoCol.appendChild(colRight);
  main.appendChild(twoCol);

  main.insertAdjacentHTML('beforeend', await fetchHTML('components/cuts-table.html'));

  app.appendChild(main);

  // ---- Footer ----
  app.insertAdjacentHTML('beforeend', await fetchHTML('components/footer.html'));

  // ---- Bootstrap MVC (all DOM elements now exist) ----
  const cutsByType = await fetchJSON('data/cuts.json');
  const controller = new AppController(cutsByType);
  controller.init();
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  document.getElementById('app').textContent = 'Erro ao carregar a aplicação.';
});
