// src/services/CalculationService.js
/**
 * CalculationService.js — All business logic calculations for the cutting factor app.
 *
 * Nomenclature used throughout:
 *   FR       = Fator de Rendimento (yield factor = cut weight / carcass weight)
 *   FC       = Fator de Custo efetivo = FC_escassez + FC_descarte
 *   FC_esc   = Parcela de escassez: FRmedio / FR  (cortes escassos pagam mais por kg)
 *   FC_desc  = Parcela de descarte: wasteWeight / sumCutWeights (flat por kg; em R$
 *              totais os cortes mais pesados/baratos absorvem mais do descarte)
 *   FRnorm   = Normalized FR (FR / totalFR)
 *   FRmedio  = Average FR per cut (totalFR / numberOfCuts)
 */
export class CalculationService {
  /**
   * Runs the full calculation pipeline for a carcass and its cuts.
   *
   * @param {import('../models/Carcass.js').Carcass} carcass
   * @param {import('../models/Cut.js').Cut[]}       cuts
   * @param {number} [targetMargin=0.30]  - decimal, e.g. 0.30 for 30%
   * @returns {{ cutResults: CutResult[], summary: Summary }}
   */
  static calculate(carcass, cuts, targetMargin = 0.30) {
    const { weight: carcassWeight, pricePerKg } = carcass;

    // Only process cuts that have a positive weight
    const validCuts = cuts.filter((c) => c.weight > 0);

    // 1. totalCost
    const totalCost = carcassWeight * pricePerKg;

    // 2. Per-cut FR = cutWeight / carcassWeight
    const frValues = validCuts.map((c) =>
      carcassWeight > 0 ? c.weight / carcassWeight : 0
    );

    // 4. wasteWeight = carcassWeight - sum(cutWeights)
    const sumCutWeights = validCuts.reduce((acc, c) => acc + c.weight, 0);
    const wasteWeight   = carcassWeight - sumCutWeights;
    const wastePercent  = carcassWeight > 0 ? wasteWeight / carcassWeight : 0;

    // 5. totalFR = sum of all FR values
    const totalFR = frValues.reduce((acc, fr) => acc + fr, 0);

    // 7. FRmedio = totalFR / numberOfCuts
    const numberOfCuts = validCuts.length;
    const frMedio = numberOfCuts > 0 ? totalFR / numberOfCuts : 0;

    // 8. FC_descarte: custo do descarte distribuído uniformemente por kg de carne útil.
    //    Em R$ totais, cortes mais pesados (baratos) absorvem proporcionalmente mais.
    //    Garante que sum(proportionalCost) == totalCost.
    const fcDescarte = sumCutWeights > 0 ? wasteWeight / sumCutWeights : 0;

    // Build per-cut results
    const cutResults = validCuts.map((cut, i) => {
      const fr = frValues[i];

      // 6. FRnorm = FR / totalFR
      const frNorm = totalFR > 0 ? fr / totalFR : 0;

      // FC_escassez = FRmedio / FR  (cortes escassos têm FC alto)
      const fcEscassez = fr > 0 ? frMedio / fr : 0;

      // FC efetivo = escassez + descarte (descarte é flat; pesa mais em peso × R$)
      const fc = fcEscassez + fcDescarte;

      // 9. realCostPerKg = pricePerKg × FC
      const realCostPerKg = pricePerKg * fc;

      // 10. proportionalCost = realCostPerKg × cutWeight
      const proportionalCost = realCostPerKg * cut.weight;

      // 11. grossRevenue = cutWeight × salePrice
      const grossRevenue = cut.weight * cut.salePrice;

      // 12. margin = (grossRevenue - proportionalCost) / grossRevenue
      const margin = grossRevenue > 0
        ? (grossRevenue - proportionalCost) / grossRevenue
        : 0;

      // 13. minPriceTarget = realCostPerKg / (1 - targetMargin)
      const minPriceTarget = targetMargin < 1 ? realCostPerKg / (1 - targetMargin) : 0;

      // 14. priceDiff = salePrice - minPriceTarget
      const priceDiff = cut.salePrice - minPriceTarget;

      return {
        cut,
        fr,
        frNorm,
        fc,
        realCostPerKg,
        proportionalCost,
        grossRevenue,
        margin,
        minPriceTarget,
        priceDiff,
      };
    });

    // 15. Summary totals
    const totalRevenue = cutResults.reduce((acc, r) => acc + r.grossRevenue, 0);
    const totalProportionalCost = cutResults.reduce((acc, r) => acc + r.proportionalCost, 0);
    const netResult = totalRevenue - totalProportionalCost;

    const averageMargin = cutResults.length > 0
      ? cutResults.reduce((acc, r) => acc + r.margin, 0) / cutResults.length
      : 0;

    const summary = {
      totalCost,
      sumCutWeights,
      wasteWeight,
      wastePercent,
      totalFR,
      frMedio,
      totalRevenue,
      netResult,
      averageMargin,
      targetMargin,
    };

    return { cutResults, summary };
  }

  /**
   * Returns the alert level for a given margin value.
   * @param {number} margin  - decimal, e.g. 0.25
   * @returns {'green' | 'yellow' | 'red'}
   */
  static marginStatus(margin) {
    if (margin >= 0.30) return 'green';
    if (margin >= 0.20) return 'yellow';
    return 'red';
  }

  /**
   * Returns the alert level for a price difference value.
   * @param {number} priceDiff
   * @returns {'positive' | 'negative'}
   */
  static priceDiffStatus(priceDiff) {
    return priceDiff >= 0 ? 'positive' : 'negative';
  }

  /**
   * Returns true when waste percentage exceeds the warning threshold.
   * @param {number} wastePercent  - decimal, e.g. 0.23
   * @returns {boolean}
   */
  static isWasteAlertActive(wastePercent) {
    return wastePercent > 0.22;
  }
}

/**
 * @typedef {Object} CutResult
 * @property {import('../models/Cut.js').Cut} cut
 * @property {number} fr                - Fator de Rendimento (carcass)
 * @property {number} frNorm            - FR normalizado (carne útil)
 * @property {number} fc                - Fator de Custo
 * @property {number} realCostPerKg     - Custo real por kg
 * @property {number} proportionalCost - Custo proporcional total do corte
 * @property {number} grossRevenue      - Faturamento bruto do corte
 * @property {number} margin            - Margem de lucro (decimal)
 * @property {number} minPriceTarget    - Preço mínimo para atingir a margem alvo
 * @property {number} priceDiff         - Diferença entre preço de venda e preço mínimo
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
 */
