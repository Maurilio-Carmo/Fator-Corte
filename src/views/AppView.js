// src/views/AppView.js
// Camada de visão MVC: toda a manipulação do DOM e renderização da UI.
// Valores fornecidos pelo usuário são sempre inseridos via textContent (nunca innerHTML) para prevenir XSS.
import {
  formatCurrency,
  formatPercent,
  formatFactor,
  formatWeight,
} from '../utils/formatters.js';
import { CalculationService } from '../services/CalculationService.js';

export class AppView {
  constructor(controller) {
    this._controller = controller;

    this._cutsListEl        = document.getElementById('cuts-list');
    this._tableBodyEl       = document.getElementById('table-body');
    this._tableEmptyRowEl   = document.getElementById('table-empty-row');
    this._wasteAlertEl      = document.getElementById('waste-alert');
    this._wasteAlertMsgEl   = document.getElementById('waste-alert-message');

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
     LISTA DE CORTES
     ============================================================ */

  renderCuts(cuts) {
    this._cutsListEl.querySelectorAll('.cut-row').forEach((el) => el.remove());

    const toggleAllBtn = document.getElementById('toggle-all-subproduct-btn');
    if (toggleAllBtn) {
      const allAre = cuts.length > 0 && cuts.every((c) => c.isSubproduct);
      toggleAllBtn.classList.toggle('active', allAre);
      toggleAllBtn.setAttribute('aria-pressed', String(allAre));
    }

    if (cuts.length === 0) {
      this._showCutsEmptyState(true);
      return;
    }

    this._showCutsEmptyState(false);
    cuts.forEach((cut) => this._cutsListEl.appendChild(this._createCutRow(cut)));
  }

  _createCutRow(cut) {
    const row = document.createElement('div');
    row.className    = 'cut-row cut-row-animated';
    row.dataset.cutId = cut.id;
    row.setAttribute('role', 'listitem');

    const nameInput = document.createElement('input');
    nameInput.type      = 'text';
    nameInput.className = 'form-input form-input-sm';
    nameInput.placeholder = 'Nome do corte';
    nameInput.setAttribute('list', 'cuts-suggestions');
    nameInput.setAttribute('autocomplete', 'off');
    nameInput.setAttribute('aria-label', 'Nome do corte');
    nameInput.value = cut.name;
    nameInput.addEventListener('input', (e) => this._controller.updateCut(cut.id, 'name', e.target.value));

    const weightInput = document.createElement('input');
    weightInput.type      = 'number';
    weightInput.className = 'form-input form-input-sm';
    weightInput.placeholder = 'kg';
    weightInput.min  = '0';
    weightInput.step = '0.001';
    weightInput.setAttribute('aria-label', 'Peso do corte em kg');
    if (cut.weight > 0) weightInput.value = cut.weight;
    weightInput.addEventListener('input', (e) => this._controller.updateCut(cut.id, 'weight', parseFloat(e.target.value) || 0));

    const priceInput = document.createElement('input');
    priceInput.type      = 'number';
    priceInput.className = 'form-input form-input-sm';
    priceInput.placeholder = 'R$/kg';
    priceInput.min  = '0';
    priceInput.step = '0.01';
    priceInput.setAttribute('aria-label', 'Preço de venda por kg');
    if (cut.salePrice > 0) priceInput.value = cut.salePrice;
    priceInput.addEventListener('input', (e) => this._controller.updateCut(cut.id, 'salePrice', parseFloat(e.target.value) || 0));

    const subproductBtn = document.createElement('button');
    subproductBtn.type      = 'button';
    subproductBtn.className = 'btn btn-subproduct btn-icon';
    subproductBtn.setAttribute('aria-label', 'Marcar como retalho/subproduto');
    subproductBtn.setAttribute('aria-pressed', String(cut.isSubproduct));
    subproductBtn.setAttribute('data-tooltip', 'Retalho (sem penalidade de escassez)');
    subproductBtn.textContent = 'R';
    if (cut.isSubproduct) subproductBtn.classList.add('active');
    subproductBtn.addEventListener('click', () => {
      const newValue = !cut.isSubproduct;
      this._controller.updateCut(cut.id, 'isSubproduct', newValue);
      subproductBtn.classList.toggle('active', newValue);
      subproductBtn.setAttribute('aria-pressed', String(newValue));
    });

    const removeBtn = document.createElement('button');
    removeBtn.type      = 'button';
    removeBtn.className = 'btn btn-danger btn-icon';
    removeBtn.setAttribute('aria-label', 'Remover corte');
    removeBtn.setAttribute('data-tooltip', 'Remover');
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      row.style.opacity    = '0';
      row.style.transform  = 'translateX(-8px)';
      row.style.transition = 'opacity 150ms ease, transform 150ms ease';
      setTimeout(() => this._controller.removeCut(cut.id), 150);
    });

    row.appendChild(nameInput);
    row.appendChild(weightInput);
    row.appendChild(priceInput);
    row.appendChild(subproductBtn);
    row.appendChild(removeBtn);
    return row;
  }

  _showCutsEmptyState(show) {
    let emptyEl = this._cutsListEl.querySelector('.cuts-empty-state');
    if (show) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.className = 'cuts-empty-state empty-state';
        emptyEl.setAttribute('role', 'listitem');
        const icon = document.createElement('span');
        icon.className   = 'empty-state-icon';
        icon.textContent = '🥩';
        const text = document.createElement('p');
        text.className   = 'empty-state-text';
        text.textContent = 'Adicione cortes usando o botão abaixo';
        emptyEl.appendChild(icon);
        emptyEl.appendChild(text);
        this._cutsListEl.appendChild(emptyEl);
      }
    } else {
      emptyEl?.remove();
    }
  }

  /* ============================================================
     TABELA DE FATORES
     ============================================================ */

  renderTable(results, targetMargin = 0.30, settings = {}) {
    const { priceMode = 'margin' } = settings;
    const pct = Math.round(targetMargin * 100);

    const thMinPrice = document.getElementById('th-min-price');
    if (thMinPrice) {
      thMinPrice.textContent = `Preço Mín ${pct}%`;
      thMinPrice.title = priceMode === 'markup'
        ? `Preço mínimo aplicando ${pct}% de markup sobre o custo real`
        : `Preço mínimo de venda para atingir ${pct}% de margem`;
    }

    const thMargin = document.getElementById('th-margin');
    if (thMargin) {
      thMargin.textContent = priceMode === 'markup' ? 'Markup %' : 'Margem %';
      thMargin.title       = priceMode === 'markup'
        ? 'Markup sobre o custo real'
        : 'Margem de lucro líquida sobre o faturamento';
    }

    this._tableBodyEl.querySelectorAll('tr:not(#table-empty-row)').forEach((r) => r.remove());

    if (results.length === 0) {
      this._tableEmptyRowEl.classList.remove('hidden');
      return;
    }

    this._tableEmptyRowEl.classList.add('hidden');
    results.forEach((result) => this._tableBodyEl.appendChild(this._createTableRow(result)));
  }

  _createTableRow(result) {
    const { cut, fr, frNorm, fc, realCostPerKg, grossRevenue, margin, minPriceTarget, priceDiff } = result;
    const tr = document.createElement('tr');

    const cells = [
      this._createTd(null, 'td-name', (td) => {
        td.textContent = cut.name || '—';
        if (cut.isSubproduct) {
          const badge = document.createElement('span');
          badge.className   = 'subproduct-badge';
          badge.textContent = 'R';
          badge.title       = 'Retalho / subproduto';
          td.appendChild(badge);
        }
      }),
      this._createTd(formatWeight(cut.weight)),
      this._createTd(formatFactor(frNorm), 'col-fr col-secondary', (td) => {
        td.setAttribute('data-tooltip', `${(frNorm * 100).toFixed(2)}% da carne útil`);
      }),
      this._createTd(formatFactor(fc), 'col-fc col-secondary', (td) => {
        td.setAttribute('data-tooltip', 'Quanto esse corte custa relativamente aos demais');
      }),
      this._createTd(formatCurrency(realCostPerKg), 'col-fc col-secondary'),
      this._createTd(formatCurrency(grossRevenue), 'col-secondary'),
      this._createTd(null, null, (td) => {
        const badge = document.createElement('span');
        badge.className   = `margin-badge margin-${CalculationService.marginStatus(margin)}`;
        badge.textContent = formatPercent(margin);
        td.appendChild(badge);
      }),
      this._createTd(formatCurrency(minPriceTarget)),
      this._createTd(null, null, (td) => {
        const span = document.createElement('span');
        span.className   = `price-diff ${CalculationService.priceDiffStatus(priceDiff)}`;
        span.textContent = (priceDiff >= 0 ? '+' : '') + formatCurrency(priceDiff);
        td.appendChild(span);
      }),
    ];

    cells.forEach((td) => tr.appendChild(td));
    return tr;
  }

  _createTd(text, extraClass, modifier) {
    const td = document.createElement('td');
    if (extraClass) td.className = extraClass;
    if (text !== null && text !== undefined) td.textContent = text;
    if (modifier) modifier(td);
    return td;
  }

  /* ============================================================
     CARDS DE RESUMO
     ============================================================ */

  renderSummary(summary) {
    const { totalCost, sumCutWeights, wasteWeight, wastePercent, totalRevenue, netResult, averageMargin } = summary;

    this._setText(this._sumTotalCutsEl, formatWeight(sumCutWeights));
    this._setText(this._sumDescarteEl,  formatWeight(Math.max(0, wasteWeight)));
    this._setText(this._sumQuebraEl,    formatPercent(Math.max(0, wastePercent)));

    if (this._sumQuebraBarEl) {
      const pct = Math.min(100, Math.max(0, wastePercent * 100));
      this._sumQuebraBarEl.style.width = pct + '%';
      this._sumQuebraBarEl.classList.toggle('warning', wastePercent > 0.15 && wastePercent <= 0.22);
      this._sumQuebraBarEl.classList.toggle('danger',  wastePercent > 0.22);
    }

    this._setText(this._sumCustoTotalEl, formatCurrency(totalCost));
    this._setText(this._sumFatTotalEl,   formatCurrency(totalRevenue));

    if (this._sumResultLiqEl) {
      this._setText(this._sumResultLiqEl, formatCurrency(netResult));
      this._sumResultLiqEl.classList.toggle('positive', netResult >= 0);
      this._sumResultLiqEl.classList.toggle('negative', netResult < 0);
    }

    this._setText(this._sumMargemMediaEl, formatPercent(averageMargin));
    if (this._sumMargemStatusEl) {
      const status = CalculationService.marginStatus(averageMargin);
      this._sumMargemStatusEl.className = `status-dot ${status}`;
      const statusLabel = { green: 'Margem boa (≥30%)', yellow: 'Margem baixa (20–30%)', red: 'Margem crítica (<20%)' };
      this._sumMargemStatusEl.setAttribute('aria-label', statusLabel[status] ?? `Margem ${status}`);
    }
  }

  /* ============================================================
     ALERTA DE QUEBRA
     ============================================================ */

  renderWasteAlert(wastePercent) {
    const active = CalculationService.isWasteAlertActive(wastePercent);

    if (active) {
      this._wasteAlertEl.classList.remove('hidden');
      if (this._wasteAlertMsgEl) {
        this._wasteAlertMsgEl.textContent =
          `Quebra atual: ${formatPercent(wastePercent)} — acima do limite recomendado de 22%. Revise os pesos dos cortes.`;
      }
      // Force reflow para reiniciar a animação de shake
      this._wasteAlertEl.classList.remove('animate');
      void this._wasteAlertEl.offsetWidth;
      this._wasteAlertEl.classList.add('animate');
    } else {
      this._wasteAlertEl.classList.add('hidden');
    }
  }

  /* ============================================================
     UTILITÁRIOS PRIVADOS
     ============================================================ */

  _setText(el, text) {
    if (el) el.textContent = text;
  }
}
