// src/utils/formatters.js
// Utilitários de formatação numérica em pt-BR.

export const formatCurrency       = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatPercent        = (v) => (v * 100).toFixed(1) + '%';
export const formatFactor         = (v) => v.toFixed(4);
export const formatWeight         = (v) => v.toFixed(3) + ' kg';
