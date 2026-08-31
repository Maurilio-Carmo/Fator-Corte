// src/views/AppView.js
// Camada de visão MVC: toda a manipulação do DOM, vinculação de eventos e
// renderização da UI vivem aqui — o Controller nunca toca o DOM diretamente.
// Valores fornecidos pelo usuário são sempre inseridos via textContent (nunca innerHTML) para prevenir XSS.
import {
  formatCurrency,
  formatPercent,
  formatFactor,
  formatWeight,
} from '../utils/formatters.js';
import { CalculationService } from '../services/CalculationService.js';
import { CustomSelect }       from './CustomSelect.js';
import { ICON_CLOSE, ICON_MEAT } from '../utils/icons.js';

export class AppView {
  constructor(controller) {
    this._controller = controller;

    this._cutsListEl        = document.getElementById('cuts-list');
    this._tableBodyEl       = document.getElementById('table-body');
    this._tableEmptyRowEl   = document.getElementById('table-empty-row');
    this._wasteAlertEl      = document.getElementById('waste-alert');
    this._wasteAlertMsgEl   = document.getElementById('waste-alert-message');
    this._wasteAlertActive  = false;

    this._sumTotalCutsEl    = document.getElementById('sum-total-cuts');
    this._sumDescarteEl     = document.getElementById('sum-descarte');
    this._sumQuebraEl       = document.getElementById('sum-quebra');
    this._sumQuebraBarEl    = document.getElementById('sum-quebra-bar');
    this._sumCustoTotalEl   = document.getElementById('sum-custo-total');
    this._sumFatTotalEl     = document.getElementById('sum-fat-total');
    this._sumResultLiqEl    = document.getElementById('sum-result-liq');
    this._sumMargemMediaEl  = document.getElementById('sum-margem-media');
    this._sumMargemStatusEl = document.getElementById('sum-margem-status');

    this._typeSelectEl   = new CustomSelect(document.getElementById('carcass-type'), {
      onChange: (value) => {
        this._controller.updateCarcass('type', value);
        this._controller.loadDefaultCutsForType(value);
      },
    });
    this._weightInputEl  = document.getElementById('carcass-weight');
    this._priceInputEl   = document.getElementById('carcass-price');
    this._marginInputEl  = document.getElementById('target-margin');
    this._addCutBtnEl    = document.getElementById('add-cut-btn');
    this._toggleAllBtnEl = document.getElementById('toggle-all-subproduct-btn');

    this._settingsBtnEl    = document.getElementById('settings-btn');
    this._drawerEl         = document.getElementById('settings-panel');
    this._drawerOverlayEl  = document.getElementById('drawer-overlay');
    this._drawerCloseBtnEl = document.getElementById('drawer-close-btn');
    this._drawerFooterEl   = document.getElementById('drawer-footer');
  }

  /* ============================================================
     VINCULAÇÃO DE EVENTOS
     ============================================================ */

  bindEvents() {
    this._bindCarcassForm();
    this._bindSettingsPanel();
  }

  _bindCarcassForm() {
    this._weightInputEl?.addEventListener('input', (e) => {
      this._controller.updateCarcass('weight', parseFloat(e.target.value) || 0);
    });

    this._priceInputEl?.addEventListener('input', (e) => {
      this._controller.updateCarcass('pricePerKg', parseFloat(e.target.value) || 0);
    });

    this._marginInputEl?.addEventListener('input', (e) => {
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

      this._controller.setTargetMargin(parseFloat(e.target.value));
    });

    this._addCutBtnEl?.addEventListener('click', () => this._controller.addCut());
    this._toggleAllBtnEl?.addEventListener('click', () => this._controller.toggleAllSubproduct());
  }

  _bindSettingsPanel() {
    const btn      = this._settingsBtnEl;
    const drawer   = this._drawerEl;
    const overlay  = this._drawerOverlayEl;
    const closeBtn = this._drawerCloseBtnEl;
    if (!btn || !drawer) return;

    // Sincroniza os botões com as configurações persistidas
    drawer.querySelectorAll('.toggle-opt').forEach((opt) => {
      opt.classList.toggle('active', this._controller.settings[opt.dataset.setting] === opt.dataset.value);
    });

    const openDrawer = () => {
      drawer.removeAttribute('inert');
      drawer.classList.add('open');
      overlay?.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('drawer-open');
      closeBtn?.focus();
    };

    const closeDrawer = () => {
      drawer.classList.remove('open');
      overlay?.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('drawer-open');
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
      this._controller.updateSetting(setting, value);
    });
  }

  /* ============================================================
     SINCRONIZAÇÃO DE CONFIGURAÇÕES NO FORMULÁRIO
     ============================================================ */

  syncInputMode(inputMode) {
    const formGroup = this._marginInputEl?.closest('.form-group');
    const isPercent = inputMode !== 'price';
    if (this._marginInputEl) this._marginInputEl.disabled = isPercent;
    if (formGroup) formGroup.classList.toggle('field-disabled', isPercent);
  }

  updateCutsDatalist(names) {
    const datalist = document.getElementById('cuts-suggestions');
    if (!datalist) return;
    datalist.replaceChildren(
      ...names.map((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        return opt;
      })
    );
  }

  /* ============================================================
     RODAPÉ PWA (instalação / atualização)
     ============================================================ */

  renderPwaFooter(state, { onInstall, onUpdate } = {}) {
    const footer = this._drawerFooterEl;
    if (!footer) return;

    const clear = () => { while (footer.firstChild) footer.removeChild(footer.firstChild); };

    // Cria/remove bolinha de notificação com estilos inline para funcionar
    // mesmo com o CSS antigo em memória (antes do reload de atualização).
    const setUpdateDot = (show) => {
      const settingsBtn = this._settingsBtnEl;
      if (!settingsBtn) return;
      const existing = settingsBtn.querySelector('.update-dot');
      if (show && !existing) {
        const dot = document.createElement('span');
        dot.className = 'update-dot';
        dot.setAttribute('aria-hidden', 'true');
        Object.assign(dot.style, {
          position: 'absolute', top: '7px', left: '7px',
          width: '10px', height: '10px', borderRadius: '50%',
          background: '#f5c542', pointerEvents: 'none', zIndex: '1',
        });
        settingsBtn.style.position = 'relative';
        settingsBtn.appendChild(dot);
      } else if (!show) {
        existing?.remove();
      }
    };

    const renderVersionInfo = (hasUpdate) => {
      clear();
      setUpdateDot(hasUpdate);

      const wrap = document.createElement('div');
      wrap.className = 'pwa-info';

      if (state.version) {
        const ver = document.createElement('span');
        ver.className   = 'pwa-version';
        ver.textContent = `Versão ${state.version}`;
        wrap.appendChild(ver);
      }

      if (hasUpdate) {
        const btn = document.createElement('button');
        btn.type        = 'button';
        btn.className   = 'btn btn-primary btn-block';
        btn.textContent = 'Atualizar aplicativo';
        btn.addEventListener('click', () => onUpdate?.());
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
      btn.addEventListener('click', () => onInstall?.());
      wrap.appendChild(btn);
      footer.appendChild(wrap);
    };

    if (state.hasUpdate)                                return renderVersionInfo(true);
    if (!state.isInstalled && state.installPrompt)       return renderInstallButton();
    renderVersionInfo(false);
  }

  /* ============================================================
     LISTA DE CORTES
     ============================================================ */

  renderCuts(cuts) {
    this._cutsListEl.querySelectorAll('.cut-row').forEach((el) => el.remove());

    const { costMode, inputMode } = this._controller.settings;
    const cutsSection = this._cutsListEl.closest('.section');
    if (cutsSection) cutsSection.dataset.costMode = costMode;

    const priceLabelEl = document.getElementById('cut-col-price-label');
    if (priceLabelEl) {
      priceLabelEl.textContent = inputMode === 'per_cut' ? '%' : 'Preço';
    }

    if (this._toggleAllBtnEl) {
      const allAre = cuts.length > 0 && cuts.every((c) => c.isSubproduct);
      this._toggleAllBtnEl.classList.toggle('active', allAre);
      this._toggleAllBtnEl.setAttribute('aria-pressed', String(allAre));
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
    priceInput.min  = '0';
    priceInput.step = '0.01';
    priceInput.addEventListener('input', (e) => this._controller.updateCut(cut.id, 'salePrice', parseFloat(e.target.value) || 0));

    const { inputMode } = this._controller.settings;
    if (inputMode === 'per_cut') {
      priceInput.placeholder = '%';
      priceInput.max = '99.99';
      priceInput.setAttribute('aria-label', 'Margem desejada para o corte em %');
      if (cut.salePrice > 0) priceInput.value = cut.salePrice;
    } else {
      priceInput.placeholder = 'R$/kg';
      priceInput.setAttribute('aria-label', 'Preço de venda por kg');
      if (cut.salePrice > 0) priceInput.value = cut.salePrice;
    }

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
    removeBtn.innerHTML = ICON_CLOSE;
    removeBtn.addEventListener('click', () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      row.classList.add('cut-row-exit');
      setTimeout(() => this._controller.removeCut(cut.id), reducedMotion ? 0 : 180);
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
        icon.className = 'empty-state-icon';
        icon.innerHTML  = ICON_MEAT;
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
    const { priceMode = 'margin', inputMode = 'price' } = settings;
    const pct = Math.round(targetMargin * 100);

    const thMinPrice = document.getElementById('th-min-price');
    if (thMinPrice) {
      thMinPrice.textContent = inputMode === 'per_cut' ? 'Preço Mín %' : `Preço Mín ${pct}%`;
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
      // Só dispara a entrada/shake na transição inativo→ativo — recalcula a
      // cada tecla digitada, então repetir a animação em todo recálculo
      // faria a tela chacoalhar enquanto o usuário digita.
      if (!this._wasteAlertActive) {
        this._wasteAlertEl.classList.remove('animate');
        void this._wasteAlertEl.offsetWidth;
        this._wasteAlertEl.classList.add('animate');
      }
      this._wasteAlertActive = true;
    } else {
      this._wasteAlertEl.classList.add('hidden');
      this._wasteAlertActive = false;
    }
  }

  /* ============================================================
     UTILITÁRIOS PRIVADOS
     ============================================================ */

  _setText(el, text) {
    if (el) el.textContent = text;
  }
}
