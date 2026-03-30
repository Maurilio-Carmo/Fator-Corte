/**
 * AppController.js — MVC Controller. Owns application state and orchestrates
 * model updates and view re-renders via CalculationService.
 */
import { Carcass }            from '../models/Carcass.js';
import { Cut }                from '../models/Cut.js';
import { CalculationService } from '../services/CalculationService.js';
import { AppView }            from '../views/AppView.js';

export class AppController {
  constructor() {
    /** @type {Carcass} */
    this._carcass = new Carcass({ weight: 0, pricePerKg: 0 });

    /** @type {Cut[]} */
    this._cuts = [];

    /** @type {number} - decimal, e.g. 0.30 for 30% */
    this._targetMargin = 0.30;

    /** @type {AppView} */
    this._view = new AppView(this);
  }

  /**
   * Initializes the controller — binds carcass form events and performs
   * an initial render to populate the UI with empty/zero state.
   */
  init() {
    this._bindCarcassForm();
    this._renderAll();
  }

  /* ============================================================
     PUBLIC API (called by AppView event handlers)
     ============================================================ */

  /**
   * Updates a field on the carcass and triggers recalculation.
   * @param {'weight' | 'pricePerKg'} field
   * @param {number} value
   */
  updateCarcass(field, value) {
    this._carcass[field] = value;
    this._recalculate();
  }

  /**
   * Adds a new empty Cut to the list and triggers recalculation.
   */
  addCut() {
    this._cuts.push(new Cut());
    this._renderAll();
  }

  /**
   * Removes the Cut with the given id and triggers recalculation.
   * @param {string} id
   */
  removeCut(id) {
    this._cuts = this._cuts.filter((c) => c.id !== id);
    this._renderAll();
  }

  /**
   * Updates a field on the Cut identified by id and triggers recalculation.
   * @param {string}                        id
   * @param {'name' | 'weight' | 'salePrice'} field
   * @param {string | number}               value
   */
  updateCut(id, field, value) {
    const cut = this._cuts.find((c) => c.id === id);
    if (!cut) return;
    cut[field] = value;
    this._recalculate();
  }

  /* ============================================================
     PRIVATE — CARCASS FORM BINDING
     ============================================================ */

  _bindCarcassForm() {
    const weightInput  = document.getElementById('carcass-weight');
    const priceInput   = document.getElementById('carcass-price');
    const marginInput  = document.getElementById('target-margin');
    const addCutBtn    = document.getElementById('add-cut-btn');

    if (weightInput) {
      weightInput.addEventListener('input', (e) => {
        this.updateCarcass('weight', parseFloat(e.target.value) || 0);
      });
    }

    if (priceInput) {
      priceInput.addEventListener('input', (e) => {
        this.updateCarcass('pricePerKg', parseFloat(e.target.value) || 0);
      });
    }

    if (marginInput) {
      marginInput.addEventListener('input', (e) => {
        const pct = parseFloat(e.target.value);
        this._targetMargin = (pct > 0 && pct < 100) ? pct / 100 : 0.30;
        this._recalculate();
      });
    }

    if (addCutBtn) {
      addCutBtn.addEventListener('click', () => this.addCut());
    }
  }

  /* ============================================================
     PRIVATE — RECALCULATION
     ============================================================ */

  /**
   * Runs the full calculation pipeline and hands results to the view.
   */
  _recalculate() {
    const { cutResults, summary } = CalculationService.calculate(
      this._carcass,
      this._cuts,
      this._targetMargin
    );

    this._view.renderTable(cutResults, this._targetMargin);
    this._view.renderSummary(summary);
    this._view.renderWasteAlert(summary.wastePercent);
  }

  /**
   * Renders the cut input rows AND triggers a recalculation.
   * Used when the cuts array structure changes (add/remove).
   */
  _renderAll() {
    this._view.renderCuts(this._cuts);
    this._recalculate();
  }
}
