// src/views/CustomSelect.js
// Combobox custom (padrão WAI-ARIA "Select-Only Combobox") para substituir
// o <select> nativo — o navegador não deixa estilizar a lista de opções dele.
// Componente de View: só DOM/teclado, nenhuma regra de negócio.
export class CustomSelect {
  /**
   * @param {HTMLElement} rootEl - wrapper com .custom-select-trigger e .custom-select-listbox
   * @param {{ onChange?: (value: string) => void }} [opts]
   */
  constructor(rootEl, { onChange } = {}) {
    this._root     = rootEl;
    this._trigger  = rootEl.querySelector('.custom-select-trigger');
    this._valueEl  = rootEl.querySelector('.custom-select-value');
    this._listbox  = rootEl.querySelector('.custom-select-listbox');
    this._options  = Array.from(rootEl.querySelectorAll('.custom-select-option'));
    this._onChange = onChange;

    this._value      = '';
    this._highlighted = -1;

    this._bindEvents();
  }

  get value() { return this._value; }

  setValue(value, { silent = false } = {}) {
    const option = this._options.find((o) => o.dataset.value === value);
    this._value = option ? value : '';

    this._options.forEach((o) => o.setAttribute('aria-selected', String(o === option)));
    this._valueEl.textContent = option ? option.textContent : this._valueEl.dataset.placeholder;
    this._valueEl.toggleAttribute('data-empty', !option);

    if (!silent && this._onChange) this._onChange(this._value);
  }

  _bindEvents() {
    this._trigger.addEventListener('click', () => this._toggle());

    this._trigger.addEventListener('keydown', (e) => {
      const isOpen = this._isOpen();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) this._open();
          this._moveHighlight(isOpen ? 1 : 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) this._open();
          this._moveHighlight(isOpen ? -1 : 0);
          break;
        case 'Home':
          if (isOpen) { e.preventDefault(); this._setHighlight(0); }
          break;
        case 'End':
          if (isOpen) { e.preventDefault(); this._setHighlight(this._options.length - 1); }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen) this._selectHighlighted();
          else this._open();
          break;
        case 'Escape':
          if (isOpen) { e.preventDefault(); this._close(); }
          break;
        case 'Tab':
          if (isOpen) this._close();
          break;
        default:
          if (isOpen && e.key.length === 1) this._typeahead(e.key);
      }
    });

    this._options.forEach((option, index) => {
      option.addEventListener('mouseenter', () => this._setHighlight(index));
      option.addEventListener('click', () => {
        this._setHighlight(index);
        this._selectHighlighted();
      });
    });

    document.addEventListener('click', (e) => {
      if (this._isOpen() && !this._root.contains(e.target)) this._close();
    });
  }

  _isOpen() { return this._listbox.classList.contains('open'); }

  _toggle() { this._isOpen() ? this._close() : this._open(); }

  _open() {
    if (this._isOpen()) return;
    this._listbox.removeAttribute('inert');
    this._listbox.classList.add('open');
    this._trigger.setAttribute('aria-expanded', 'true');
    const startIndex = this._options.findIndex((o) => o.dataset.value === this._value);
    this._setHighlight(startIndex >= 0 ? startIndex : 0);
  }

  _close() {
    if (!this._isOpen()) return;
    this._listbox.classList.remove('open');
    this._trigger.setAttribute('aria-expanded', 'false');
    this._trigger.removeAttribute('aria-activedescendant');
    this._listbox.addEventListener('transitionend', () => this._listbox.setAttribute('inert', ''), { once: true });
  }

  _moveHighlight(delta) {
    const next = Math.min(this._options.length - 1, Math.max(0, this._highlighted + delta));
    this._setHighlight(next);
  }

  _setHighlight(index) {
    if (index < 0 || index >= this._options.length) return;
    this._options.forEach((o) => o.classList.remove('highlighted'));
    this._highlighted = index;
    const option = this._options[index];
    option.classList.add('highlighted');
    option.scrollIntoView({ block: 'nearest' });
    this._trigger.setAttribute('aria-activedescendant', option.id);
  }

  _selectHighlighted() {
    const option = this._options[this._highlighted];
    if (option) this.setValue(option.dataset.value);
    this._close();
    this._trigger.focus();
  }

  _typeahead(char) {
    const lower = char.toLowerCase();
    const start = (this._highlighted + 1) % this._options.length;
    for (let i = 0; i < this._options.length; i++) {
      const index = (start + i) % this._options.length;
      if (this._options[index].textContent.trim().toLowerCase().startsWith(lower)) {
        this._setHighlight(index);
        break;
      }
    }
  }
}
