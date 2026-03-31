// src/app.js
// Ponto de entrada: carrega os componentes HTML, monta o layout e inicializa o MVC.
import { AppController } from './controllers/AppController.js';

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

// Registro do Service Worker para funcionamento offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('Service Worker não registrado:', err);
  });
}
