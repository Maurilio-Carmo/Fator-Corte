// src/models/Carcass.js
/**
 * Carcass.js — Model representing a beef carcass with weight and price.
 */
export class Carcass {
  /**
   * @param {Object} params
   * @param {string} [params.type]     - Carcass type (traseiro, dianteiro, etc.)
   * @param {number} params.weight     - Total carcass weight in kg
   * @param {number} params.pricePerKg - Purchase price per kg in R$
   */
  constructor({ type = 'traseiro', weight = 0, pricePerKg = 0 } = {}) {
    this.type = type;
    this.weight = weight;
    this.pricePerKg = pricePerKg;
  }

  /**
   * Total acquisition cost of the carcass.
   * @returns {number}
   */
  get totalCost() {
    return this.weight * this.pricePerKg;
  }

  /**
   * Returns a plain object representation (useful for serialization).
   * @returns {{ weight: number, pricePerKg: number, totalCost: number }}
   */
  toJSON() {
    return {
      weight: this.weight,
      pricePerKg: this.pricePerKg,
      totalCost: this.totalCost,
    };
  }
}
