// src/utils/formatters.js
// Utilitários de formatação numérica em pt-BR.

export const formatCurrency       = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatPercent        = (v) => (v * 100).toFixed(1) + '%';
export const formatFactor         = (v) => v.toFixed(4);
export const formatWeight         = (v) => v.toFixed(3) + ' kg';
export const formatWeightShort    = (v) => v.toFixed(3);
export const formatCurrencyPlain  = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatCurrencySigned = (v) => {
  const abs = formatCurrency(Math.abs(v));
  return v >= 0 ? '+\u202F' + abs : '-\u202F' + formatCurrency(Math.abs(v));
};
