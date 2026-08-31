// src/controllers/AppController.js
// Controlador MVC: gerencia o estado da aplicação e coordena modelo e visão.
// Não toca o DOM nem localStorage diretamente — isso é responsabilidade de
// AppView e SettingsService, respectivamente.
import { Carcass }            from '../models/Carcass.js';
import { Cut }                from '../models/Cut.js';
import { CalculationService } from '../services/CalculationService.js';
import { SettingsService }    from '../services/SettingsService.js';
import { AppView }            from '../views/AppView.js';

export class AppController {
  /**
   * @param {Object} [cutsByType]
   * @param {import('../services/PwaManager.js').PwaManager} [pwaManager]
   */
  constructor(cutsByType = {}, pwaManager = null) {
    this._cutsByType   = cutsByType;
    this._pwaManager   = pwaManager;
    this._carcass      = new Carcass({ weight: 0, pricePerKg: 0 });
    this._cuts         = [];
    this._targetMargin = 0.30;
    this._settings     = SettingsService.load();
    this._view         = new AppView(this);
  }

  init() {
    this._view.bindEvents();
    this._view.syncInputMode(this._settings.inputMode);
    this._renderAll();
    this._bindPwaManager();
  }

  get settings() { return this._settings; }

  /* ============================================================
     API PÚBLICA — CARCAÇA E CORTES
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

  setTargetMargin(percent) {
    this._targetMargin = (percent >= 0.01 && percent <= 99.99) ? percent / 100 : 0.30;
    this._recalculate();
  }

  loadDefaultCutsForType(type) {
    const names = this._cutsByType[type] ?? [];
    this._cuts  = names.map((name) => new Cut({ name }));
    this._view.updateCutsDatalist(names);
    this._renderAll();
  }

  /* ============================================================
     API PÚBLICA — CONFIGURAÇÕES
     ============================================================ */

  updateSetting(setting, value) {
    this._settings[setting] = value;
    SettingsService.save(this._settings);
    if (setting === 'inputMode') this._view.syncInputMode(this._settings.inputMode);
    this._renderAll();
  }

  /* ============================================================
     PWA (instalação / atualização)
     ============================================================ */

  _bindPwaManager() {
    if (!this._pwaManager) return;
    const render = () => this._view.renderPwaFooter(this._pwaManager.state, {
      onInstall: () => this._pwaManager.promptInstall(),
      onUpdate:  () => this._pwaManager.applyUpdate(),
    });
    this._pwaManager.addEventListener('change', render);
    render();
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
