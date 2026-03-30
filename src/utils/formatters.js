// src/utils/formatters.js
/**
 * formatters.js — Number, currency, and percentage formatting helpers.
 * All formatters use pt-BR locale conventions.
 */

/**
 * Formats a value as Brazilian Real currency.
 * @param {number} v
 * @returns {string}  e.g. "R$ 1.234,56"
 */
export const formatCurrency = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Formats a decimal ratio as a percentage string with one decimal.
 * @param {number} v  - e.g. 0.2745
 * @returns {string}  - e.g. "27.5%"
 */
export const formatPercent = (v) => (v * 100).toFixed(1) + '%';

/**
 * Formats a factor value to 4 decimal places.
 * @param {number} v  - e.g. 1.2345
 * @returns {string}  - e.g. "1.2345"
 */
export const formatFactor = (v) => v.toFixed(4);

/**
 * Formats a weight in kilograms to 3 decimal places.
 * @param {number} v  - e.g. 12.500
 * @returns {string}  - e.g. "12.500 kg"
 */
export const formatWeight = (v) => v.toFixed(3) + ' kg';

/**
 * Formats a number as a compact weight without the unit label.
 * @param {number} v
 * @returns {string}
 */
export const formatWeightShort = (v) => v.toFixed(3);

/**
 * Formats a currency value with sign prefix (+ or -).
 * @param {number} v
 * @returns {string}
 */
export const formatCurrencySigned = (v) => {
  const abs = formatCurrency(Math.abs(v));
  return v >= 0 ? '+\u202F' + abs : '-\u202F' + formatCurrency(Math.abs(v));
};

/**
 * Formats a number to 2 decimal places for currency inputs.
 * @param {number} v
 * @returns {string}
 */
export const formatCurrencyPlain = (v) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
