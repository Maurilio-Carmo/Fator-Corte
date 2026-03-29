/**
 * AppView.js — MVC View layer. All DOM rendering and UI updates.
 *
 * Security note: user-supplied string values are always set via
 * element.textContent (never innerHTML) to prevent XSS.
 */
import {
  formatCurrency,
  formatPercent,
  formatFactor,
  formatWeight,
  formatWeightShort,
} from '../utils/formatters.js';
import { CalculationService } from '../services/CalculationService.js';

export class AppView {
  /**
   * @param {import('../controllers/AppController.js').AppController} controller
   */
  constructor(controller) {
    this._controller = controller;

    // Cached DOM references
    this._cutsListEl        = document.getElementById('cuts-list');
    this._tableBodyEl       = document.getElementById('table-body');
    this._tableEmptyRowEl   = document.getElementById('table-empty-row');
    this._wasteAlertEl      = document.getElementById('waste-alert');
    this._wasteAlertMsgEl   = document.getElementById('waste-alert-message');

    // Summary card value elements
    this._sumTotalCutsEl    = document.getElementById('sum-total-cuts');
    this._sumDescarteEl     = document.getElementById('sum-descarte');
    this._sumQuebraEl       = document.getElementById('sum-quebra');
    this._sumQuebraBarEl    = document.getElementById('sum-quebra-bar');
    this._sumCustoTotalEl   = document.getElementById('sum-custo-total');
    this._sumFatTotalEl     = document.getElementById('sum-fat-total');
    this._sumResultLiqEl    = document.getElementById('sum-result-liq');
    this._sumMargemMediaEl  = document.getElementById('sum-margem-media');
    this._sumMargemStatusEl = document.getElementById('sum-margem-status');
  }

  /* ============================================================
     CUT ROWS (left column form)
     ============================================================ */

  /**
   * Re-renders the entire cuts input list.
   * @param {import('../models/Cut.js').Cut[]} cuts
   */
  renderCuts(cuts) {
    // Remove all existing cut rows (keep header row if present)
    const existing = this._cutsListEl.querySelectorAll('.cut-row');
    existing.forEach((el) => el.remove());

    if (cuts.length === 0) {
      this._showCutsEmptyState(true);
      return;
    }

    this._showCutsEmptyState(false);

    cuts.forEach((cut) => {
      const row = this._createCutRow(cut);
      this._cutsListEl.appendChild(row);
    });
  }

  /**
   * Creates a single cut input row element.
   * @param {import('../models/Cut.js').Cut} cut
   * @returns {HTMLElement}
   */
  _createCutRow(cut) {
    const row = document.createElement('div');
    row.className = 'cut-row cut-row-animated';
    row.dataset.cutId = cut.id;

    // Name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-input form-input-sm';
    nameInput.placeholder = 'Nome do corte';
    nameInput.setAttribute('list', 'cuts-suggestions');
    nameInput.setAttribute('autocomplete', 'off');
    nameInput.setAttribute('aria-label', 'Nome do corte');
    nameInput.value = cut.name; // safe: value property, not innerHTML
    nameInput.addEventListener('input', (e) => {
      this._controller.updateCut(cut.id, 'name', e.target.value);
    });

    // Weight input
    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.className = 'form-input form-input-sm';
    weightInput.placeholder = 'kg';
    weightInput.min = '0';
    weightInput.step = '0.001';
    weightInput.setAttribute('aria-label', 'Peso do corte em kg');
    if (cut.weight > 0) weightInput.value = cut.weight;
    weightInput.addEventListener('input', (e) => {
      this._controller.updateCut(cut.id, 'weight', parseFloat(e.target.value) || 0);
    });

    // Sale price input
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'form-input form-input-sm';
    priceInput.placeholder = 'R$/kg';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.setAttribute('aria-label', 'Preço de venda por kg');
    if (cut.salePrice > 0) priceInput.value = cut.salePrice;
    priceInput.addEventListener('input', (e) => {
      this._controller.updateCut(cut.id, 'salePrice', parseFloat(e.target.value) || 0);
    });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger btn-icon';
    removeBtn.setAttribute('aria-label', 'Remover corte');
    removeBtn.setAttribute('data-tooltip', 'Remover');
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      row.style.opacity = '0';
      row.style.transform = 'translateX(-8px)';
      row.style.transition = 'opacity 150ms ease, transform 150ms ease';
      setTimeout(() => this._controller.removeCut(cut.id), 150);
    });

    row.appendChild(nameInput);
    row.appendChild(weightInput);
    row.appendChild(priceInput);
    row.appendChild(removeBtn);

    return row;
  }

  _showCutsEmptyState(show) {
    let emptyEl = this._cutsListEl.querySelector('.cuts-empty-state');
    if (show) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.className = 'cuts-empty-state empty-state';
        const icon = document.createElement('span');
        icon.className = 'empty-state-icon';
        icon.textContent = '🥩';
        const text = document.createElement('p');
        text.className = 'empty-state-text';
        text.textContent = 'Adicione cortes usando o botão abaixo';
        emptyEl.appendChild(icon);
        emptyEl.appendChild(text);
        this._cutsListEl.appendChild(emptyEl);
      }
    } else {
      if (emptyEl) emptyEl.remove();
    }
  }

  /* ============================================================
     FACTORS TABLE
     ============================================================ */

  /**
   * Renders the full factors table body.
   * @param {import('../services/CalculationService.js').CutResult[]} results
   */
  renderTable(results) {
    // Clear existing data rows (keep empty row as reference)
    const dataRows = this._tableBodyEl.querySelectorAll('tr:not(#table-empty-row)');
    dataRows.forEach((r) => r.remove());

    if (results.length === 0) {
      this._tableEmptyRowEl.classList.remove('hidden');
      return;
    }

    this._tableEmptyRowEl.classList.add('hidden');

    results.forEach((result) => {
      const tr = this._createTableRow(result);
      this._tableBodyEl.appendChild(tr);
    });
  }

  /**
   * Creates a single table row for a cut result.
   * @param {import('../services/CalculationService.js').CutResult} result
   * @returns {HTMLTableRowElement}
   */
  _createTableRow(result) {
    const { cut, fr, frNorm, fc, realCostPerKg, grossRevenue, margin, minPrice30, priceDiff } = result;

    const tr = document.createElement('tr');

    const cells = [
      // Corte
      this._createTd(null, 'td-name', (td) => {
        td.textContent = cut.name || '—';
      }),
      // Peso (kg)
      this._createTd(formatWeight(cut.weight)),
      // FR Carcaça
      this._createTd(formatFactor(fr), 'col-fr', (td) => {
        td.setAttribute('data-tooltip', `${(fr * 100).toFixed(2)}% da carcaça`);
      }),
      // FR Carne Útil
      this._createTd(formatFactor(frNorm), 'col-fr', (td) => {
        td.setAttribute('data-tooltip', `${(frNorm * 100).toFixed(2)}% da carne útil`);
      }),
      // Fator de Custo (FC)
      this._createTd(formatFactor(fc), 'col-fc', (td) => {
        td.setAttribute('data-tooltip', 'Quanto esse corte custa relativamente aos demais');
      }),
      // Custo Real/kg
      this._createTd(formatCurrency(realCostPerKg), 'col-fc'),
      // Faturamento Bruto
      this._createTd(formatCurrency(grossRevenue)),
      // Margem %
      this._createTd(null, null, (td) => {
        const status = CalculationService.marginStatus(margin);
        const badge = document.createElement('span');
        badge.className = `margin-badge margin-${status}`;
        badge.textContent = formatPercent(margin);
        td.appendChild(badge);
      }),
      // Preço Mín 30%
      this._createTd(formatCurrency(minPrice30)),
      // Dif. Preço
      this._createTd(null, null, (td) => {
        const status = CalculationService.priceDiffStatus(priceDiff);
        const span = document.createElement('span');
        span.className = `price-diff ${status}`;
        const prefix = priceDiff >= 0 ? '+' : '';
        span.textContent = prefix + formatCurrency(priceDiff);
        td.appendChild(span);
      }),
    ];

    cells.forEach((td) => tr.appendChild(td));
    return tr;
  }

  /**
   * Helper: creates a <td> with optional class and text content.
   * @param {string|null} text
   * @param {string|null} [extraClass]
   * @param {function(HTMLTableCellElement):void} [modifier]
   * @returns {HTMLTableCellElement}
   */
  _createTd(text, extraClass, modifier) {
    const td = document.createElement('td');
    if (extraClass) td.className = extraClass;
    if (text !== null && text !== undefined) td.textContent = text;
    if (modifier) modifier(td);
    return td;
  }

  /* ============================================================
     SUMMARY CARDS
     ============================================================ */

  /**
   * Updates all summary card values.
   * @param {import('../services/CalculationService.js').Summary} summary
   */
  renderSummary(summary) {
    const {
      totalCost,
      sumCutWeights,
      wasteWeight,
      wastePercent,
      totalRevenue,
      netResult,
      averageMargin,
    } = summary;

    // Card 1: Cortes / Descarte / Quebra
    this._setText(this._sumTotalCutsEl, formatWeight(sumCutWeights));
    this._setText(this._sumDescarteEl,  formatWeight(Math.max(0, wasteWeight)));
    this._setText(this._sumQuebraEl,    formatPercent(Math.max(0, wastePercent)));

    // Waste bar
    if (this._sumQuebraBarEl) {
      const pct = Math.min(100, Math.max(0, wastePercent * 100));
      this._sumQuebraBarEl.style.width = pct + '%';
      this._sumQuebraBarEl.classList.toggle('warning', wastePercent > 0.15 && wastePercent <= 0.22);
      this._sumQuebraBarEl.classList.toggle('danger', wastePercent > 0.22);
    }

    // Card 2: Custo Total
    this._setText(this._sumCustoTotalEl, formatCurrency(totalCost));

    // Card 3: Faturamento / Resultado Líquido
    this._setText(this._sumFatTotalEl, formatCurrency(totalRevenue));
    if (this._sumResultLiqEl) {
      this._setText(this._sumResultLiqEl, formatCurrency(netResult));
      this._sumResultLiqEl.classList.toggle('positive', netResult >= 0);
      this._sumResultLiqEl.classList.toggle('negative', netResult < 0);
    }

    // Card 4: Margem Média
    this._setText(this._sumMargemMediaEl, formatPercent(averageMargin));
    if (this._sumMargemStatusEl) {
      const status = CalculationService.marginStatus(averageMargin);
      this._sumMargemStatusEl.className = `status-dot ${status}`;
      this._sumMargemStatusEl.setAttribute('aria-label', `Margem ${status}`);
    }
  }

  /* ============================================================
     WASTE ALERT
     ============================================================ */

  /**
   * Shows or hides the waste alert banner.
   * @param {number} wastePercent  - decimal (0–1)
   */
  renderWasteAlert(wastePercent) {
    const active = CalculationService.isWasteAlertActive(wastePercent);

    if (active) {
      this._wasteAlertEl.classList.remove('hidden');
      if (this._wasteAlertMsgEl) {
        // Use textContent — safe, value is numeric, not user input
        this._wasteAlertMsgEl.textContent =
          `Quebra atual: ${formatPercent(wastePercent)} — acima do limite recomendado de 22%. Revise os pesos dos cortes.`;
      }
      // Trigger shake animation
      this._wasteAlertEl.classList.remove('animate');
      void this._wasteAlertEl.offsetWidth; // force reflow
      this._wasteAlertEl.classList.add('animate');
    } else {
      this._wasteAlertEl.classList.add('hidden');
    }
  }

  /* ============================================================
     PRIVATE HELPERS
     ============================================================ */

  /**
   * Sets textContent safely, no-ops on null elements.
   * @param {HTMLElement|null} el
   * @param {string} text
   */
  _setText(el, text) {
    if (el) el.textContent = text;
  }
}
