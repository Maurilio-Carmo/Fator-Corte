// src/services/CalculationService.js
// Toda a lógica de cálculo do fator de corte.
//
// Nomenclatura utilizada:
//   FR       = Fator de Rendimento  (peso do corte / peso da carcaça)
//   FC       = Fator de Custo       = FC_escassez + FC_descarte
//   FC_esc   = Parcela de escassez  = FRmedio / FR  (cortes escassos pagam mais por kg)
//   FC_desc  = Parcela de descarte  = pesoDescarte / somaPesoCortes  (flat por kg;
//              em R$ totais os cortes mais pesados absorvem mais do descarte)
//   FRnorm   = FR normalizado       = FR / totalFR
//   FRmedio  = FR médio por corte   = totalFR / nCortes

export class CalculationService {
  /**
   * @param {import('../models/Carcass.js').Carcass} carcass
   * @param {import('../models/Cut.js').Cut[]}       cuts
   * @param {number} [targetMargin=0.30]             - Decimal (ex: 0.30 = 30%)
   * @param {{ priceMode?: 'margin'|'markup', costMode?: 'scarcity'|'equal', inputMode?: 'price'|'margin_global'|'per_cut' }} [settings]
   * @returns {{ cutResults: CutResult[], summary: Summary }}
   */
  static calculate(carcass, cuts, targetMargin = 0.30, settings = {}) {
    const { priceMode = 'margin', costMode = 'scarcity', inputMode = 'price' } = settings;
    const { weight: carcassWeight, pricePerKg } = carcass;

    const validCuts     = cuts.filter((c) => c.weight > 0);
    const totalCost     = carcassWeight * pricePerKg;
    const frValues      = validCuts.map((c) => carcassWeight > 0 ? c.weight / carcassWeight : 0);
    const sumCutWeights = validCuts.reduce((acc, c) => acc + c.weight, 0);
    const wasteWeight   = carcassWeight - sumCutWeights;
    const wastePercent  = carcassWeight > 0 ? wasteWeight / carcassWeight : 0;
    const totalFR       = frValues.reduce((acc, fr) => acc + fr, 0);
    const numberOfCuts  = validCuts.length;
    const frMedio       = numberOfCuts > 0 ? totalFR / numberOfCuts : 0;

    // Custo do descarte distribuído uniformemente por kg de carne útil.
    // Garante que sum(custosProporcional) == totalCost.
    const fcDescarte = sumCutWeights > 0 ? wasteWeight / sumCutWeights : 0;

    const cutResults = validCuts.map((cut, i) => {
      const fr     = frValues[i];
      const frNorm = totalFR > 0 ? fr / totalFR : 0;

      // Modo igualitário ou retalho: sem penalidade de escassez (FC_esc = 1).
      // Modo por escassez: cortes menores têm FC mais alto (FRmedio / FR).
      const fcEscassez = (costMode === 'equal' || cut.isSubproduct)
        ? 1
        : (fr > 0 ? frMedio / fr : 0);

      const fc              = fcEscassez + fcDescarte;
      const realCostPerKg   = pricePerKg * fc;
      const proportionalCost = realCostPerKg * cut.weight;

      let grossRevenue, margin, minPriceTarget, priceDiff;

      if (inputMode === 'per_cut') {
        // cut.salePrice armazena a margem desejada em % (ex: 30 → 30%)
        const cutMargin = cut.salePrice / 100;
        minPriceTarget = priceMode === 'markup'
          ? realCostPerKg * (1 + cutMargin)
          : (cutMargin < 1 ? realCostPerKg / (1 - cutMargin) : 0);
        grossRevenue = cut.weight * minPriceTarget;
        margin       = cutMargin;
        priceDiff    = 0;
      } else if (inputMode === 'margin_global') {
        // Usa a margem global (targetMargin) para calcular o preço mínimo de cada corte
        minPriceTarget = priceMode === 'markup'
          ? realCostPerKg * (1 + targetMargin)
          : (targetMargin < 1 ? realCostPerKg / (1 - targetMargin) : 0);
        grossRevenue = cut.weight * minPriceTarget;
        margin       = targetMargin;
        priceDiff    = 0;
      } else {
        // Modo padrão: usuário informa o preço de venda
        grossRevenue = cut.weight * cut.salePrice;
        margin = priceMode === 'markup'
          ? (proportionalCost > 0 ? (grossRevenue - proportionalCost) / proportionalCost : 0)
          : (grossRevenue > 0 ? (grossRevenue - proportionalCost) / grossRevenue : 0);
        minPriceTarget = priceMode === 'markup'
          ? realCostPerKg * (1 + targetMargin)
          : (targetMargin < 1 ? realCostPerKg / (1 - targetMargin) : 0);
        priceDiff = cut.salePrice - minPriceTarget;
      }

      return { cut, fr, frNorm, fc, realCostPerKg, proportionalCost, grossRevenue, margin, minPriceTarget, priceDiff };
    });

    const totalRevenue         = cutResults.reduce((acc, r) => acc + r.grossRevenue, 0);
    const totalProportionalCost = cutResults.reduce((acc, r) => acc + r.proportionalCost, 0);
    const netResult            = totalRevenue - totalProportionalCost;
    const averageMargin        = cutResults.length > 0
      ? cutResults.reduce((acc, r) => acc + r.margin, 0) / cutResults.length
      : 0;

    const summary = {
      totalCost, sumCutWeights, wasteWeight, wastePercent,
      totalFR, frMedio, totalRevenue, netResult, averageMargin, targetMargin,
    };

    return { cutResults, summary };
  }

  // Nível de alerta da margem/markup: verde ≥ 30%, amarelo ≥ 20%, vermelho < 20%
  static marginStatus(margin) {
    if (margin >= 0.30) return 'green';
    if (margin >= 0.20) return 'yellow';
    return 'red';
  }

  static priceDiffStatus(priceDiff) {
    return priceDiff >= 0 ? 'positive' : 'negative';
  }

  // Alerta de quebra acima de 22%
  static isWasteAlertActive(wastePercent) {
    return wastePercent > 0.22;
  }
}

/**
 * @typedef {Object} CutResult
 * @property {import('../models/Cut.js').Cut} cut
 * @property {number} fr               - Fator de Rendimento
 * @property {number} frNorm           - FR normalizado (% da carne útil)
 * @property {number} fc               - Fator de Custo efetivo
 * @property {number} realCostPerKg    - Custo real por kg
 * @property {number} proportionalCost - Custo proporcional do corte
 * @property {number} grossRevenue     - Faturamento bruto
 * @property {number} margin           - Margem ou markup (decimal)
 * @property {number} minPriceTarget   - Preço mínimo para a meta
 * @property {number} priceDiff        - Diferença entre preço de venda e preço mínimo
 */

/**
 * @typedef {Object} Summary
 * @property {number} totalCost
 * @property {number} sumCutWeights
 * @property {number} wasteWeight
 * @property {number} wastePercent
 * @property {number} totalFR
 * @property {number} frMedio
 * @property {number} totalRevenue
 * @property {number} netResult
 * @property {number} averageMargin
 * @property {number} targetMargin
 */
