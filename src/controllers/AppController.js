// src/controllers/AppController.js
// Controlador MVC: gerencia o estado da aplicação e coordena modelo e visão.
import { Carcass }            from '../models/Carcass.js';
import { Cut }                from '../models/Cut.js';
import { CalculationService } from '../services/CalculationService.js';
import { AppView }            from '../views/AppView.js';

export class AppController {
  constructor(cutsByType = {}) {
    this._cutsByType   = cutsByType;
    this._carcass      = new Carcass({ weight: 0, pricePerKg: 0 });
    this._cuts         = [];
    this._targetMargin = 0.30;
    this._settings     = this._loadSettings();
    this._view         = new AppView(this);
  }

  init() {
    this._bindCarcassForm();
    this._renderAll();
  }

  get settings() { return this._settings; }

  /* ============================================================
     API PÚBLICA
     ============================================================ */

  updateCarcass(field, value) {
    this._carcass[field] = value;
    this._recalculate();
  }

  addCut() {
    this._cuts.push(new Cut());
    this._renderAll();
  }

  removeCut(id) {
    this._cuts = this._cuts.filter((c) => c.id !== id);
    this._renderAll();
  }

  /**
   * @param {string}                                           id
   * @param {'name'|'weight'|'salePrice'|'isSubproduct'}      field
   * @param {string|number|boolean}                            value
   */
  updateCut(id, field, value) {
    const cut = this._cuts.find((c) => c.id === id);
    if (!cut) return;
    cut[field] = value;
    this._recalculate();
  }

  // Marca todos como retalho se algum não for; desmarca todos se todos já forem.
  toggleAllSubproduct() {
    const allAre = this._cuts.every((c) => c.isSubproduct);
    this._cuts.forEach((c) => { c.isSubproduct = !allAre; });
    this._renderAll();
  }

  /* ============================================================
     VINCULAÇÃO DO FORMULÁRIO
     ============================================================ */

  _bindCarcassForm() {
    const typeSelect  = document.getElementById('carcass-type');
    const weightInput = document.getElementById('carcass-weight');
    const priceInput  = document.getElementById('carcass-price');
    const marginInput = document.getElementById('target-margin');
    const addCutBtn   = document.getElementById('add-cut-btn');

    typeSelect?.addEventListener('change', (e) => {
      this.updateCarcass('type', e.target.value);
      this._loadDefaultCuts(e.target.value);
    });

    weightInput?.addEventListener('input', (e) => {
      this.updateCarcass('weight', parseFloat(e.target.value) || 0);
    });

    priceInput?.addEventListener('input', (e) => {
      this.updateCarcass('pricePerKg', parseFloat(e.target.value) || 0);
    });

    if (marginInput) {
      marginInput.addEventListener('input', (e) => {
        let raw = e.target.value;

        // Limita a 2 casas decimais
        const dot = raw.indexOf('.');
        if (dot !== -1 && raw.length - dot > 3) {
          raw = raw.slice(0, dot + 3);
          e.target.value = raw;
        }

        // Clamp ao máximo 99.99
        const pct = parseFloat(raw);
        if (!isNaN(pct) && pct > 99.99) e.target.value = '99.99';

        const final = parseFloat(e.target.value);
        this._targetMargin = (final >= 0.01 && final <= 99.99) ? final / 100 : 0.30;
        this._recalculate();
      });
    }

    addCutBtn?.addEventListener('click', () => this.addCut());

    document.getElementById('toggle-all-subproduct-btn')
      ?.addEventListener('click', () => this.toggleAllSubproduct());

    this._bindSettingsPanel();
  }

  _bindSettingsPanel() {
    const btn      = document.getElementById('settings-btn');
    const drawer   = document.getElementById('settings-panel');
    const overlay  = document.getElementById('drawer-overlay');
    const closeBtn = document.getElementById('drawer-close-btn');
    if (!btn || !drawer) return;

    // Sincroniza os botões com as configurações persistidas
    drawer.querySelectorAll('.toggle-opt').forEach((opt) => {
      opt.classList.toggle('active', this._settings[opt.dataset.setting] === opt.dataset.value);
    });

    const openDrawer = () => {
      drawer.removeAttribute('inert');
      drawer.classList.add('open');
      overlay?.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      closeBtn?.focus();
    };

    const closeDrawer = () => {
      drawer.classList.remove('open');
      overlay?.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      drawer.addEventListener('transitionend', () => drawer.setAttribute('inert', ''), { once: true });
      btn.focus();
    };

    btn.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });

    // Alterna configurações
    drawer.addEventListener('click', (e) => {
      const opt = e.target.closest('.toggle-opt');
      if (!opt) return;
      const { setting, value } = opt.dataset;
      if (!setting || !value) return;
      opt.closest('.toggle-group')?.querySelectorAll('.toggle-opt').forEach((o) => {
        o.classList.toggle('active', o === opt);
      });
      this._settings[setting] = value;
      this._saveSettings();
      this._renderAll();
    });

    this._bindPwaFooter();
  }

  _bindPwaFooter() {
    const footer = document.getElementById('drawer-footer');
    if (!footer) return;

    const VERSION     = window.__pwa?.version ?? '';
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;

    const clear = () => { while (footer.firstChild) footer.removeChild(footer.firstChild); };

    const renderVersionInfo = (hasUpdate = false) => {
      clear();
      const wrap = document.createElement('div');
      wrap.className = 'pwa-info';

      if (VERSION) {
        const ver = document.createElement('span');
        ver.className   = 'pwa-version';
        ver.textContent = `Versão ${VERSION}`;
        wrap.appendChild(ver);
      }

      if (hasUpdate) {
        const btn = document.createElement('button');
        btn.type        = 'button';
        btn.className   = 'btn btn-primary btn-block';
        btn.textContent = 'Atualizar aplicativo';
        btn.addEventListener('click', () => window.location.reload());
        wrap.appendChild(btn);
      }

      footer.appendChild(wrap);
    };

    const renderInstallButton = () => {
      clear();
      const wrap = document.createElement('div');
      wrap.className = 'pwa-info';
      const btn = document.createElement('button');
      btn.type        = 'button';
      btn.className   = 'btn btn-primary btn-block';
      btn.textContent = 'Instalar aplicativo';
      btn.addEventListener('click', async () => {
        const prompt = window.__pwa?.installPrompt;
        if (!prompt) return;
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          if (window.__pwa) window.__pwa.installPrompt = null;
          renderVersionInfo(false);
        }
      });
      wrap.appendChild(btn);
      footer.appendChild(wrap);
    };

    // Decide o estado correto e re-renderiza ao receber eventos
    const refresh = () => {
      if (window.__pwa?.hasUpdate)                     return renderVersionInfo(true);
      if (!isInstalled && window.__pwa?.installPrompt) return renderInstallButton();
      renderVersionInfo(false);
    };

    window.addEventListener('pwa-update-ready', () => {
      if (window.__pwa) window.__pwa.hasUpdate = true;
      refresh();
    }, { once: true });

    window.addEventListener('pwa-installable', () => refresh(), { once: true });

    refresh();
  }

  /* ============================================================
     PERSISTÊNCIA DE CONFIGURAÇÕES
     ============================================================ */

  static _SETTINGS_KEY = 'fc_settings';

  _loadSettings() {
    const defaults = { priceMode: 'margin', costMode: 'scarcity' };
    try {
      const saved = JSON.parse(localStorage.getItem(AppController._SETTINGS_KEY));
      if (saved && typeof saved === 'object') {
        return {
          priceMode: saved.priceMode === 'markup'  ? 'markup'  : 'margin',
          costMode:  saved.costMode  === 'equal'   ? 'equal'   : 'scarcity',
        };
      }
    } catch { /* ignora erros de parse */ }
    return defaults;
  }

  _saveSettings() {
    try {
      localStorage.setItem(AppController._SETTINGS_KEY, JSON.stringify(this._settings));
    } catch { /* ignora erros de quota */ }
  }

  /* ============================================================
     CARREGAMENTO DE CORTES PADRÃO
     ============================================================ */

  _loadDefaultCuts(type) {
    const names = this._cutsByType[type] ?? [];
    this._cuts  = names.map((name) => new Cut({ name }));
    this._updateDatalist(type);
    this._renderAll();
  }

  _updateDatalist(type) {
    const datalist = document.getElementById('cuts-suggestions');
    if (!datalist) return;
    const names = this._cutsByType[type] ?? [];
    datalist.replaceChildren(
      ...names.map((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        return opt;
      })
    );
  }

  /* ============================================================
     RECALCULAÇÃO E RENDERIZAÇÃO
     ============================================================ */

  _recalculate() {
    const { cutResults, summary } = CalculationService.calculate(
      this._carcass, this._cuts, this._targetMargin, this._settings
    );
    this._view.renderTable(cutResults, this._targetMargin, this._settings);
    this._view.renderSummary(summary);
    this._view.renderWasteAlert(summary.wastePercent);
  }

  // Renderiza as linhas de cortes E recalcula. Usado quando a estrutura muda (add/remove).
  _renderAll() {
    this._view.renderCuts(this._cuts);
    this._recalculate();
  }
}
