// src/models/Carcass.js
// Modelo de uma carcaça bovina com peso e preço de compra.
export class Carcass {
  /**
   * @param {Object} [params]
   * @param {string} [params.type]       - Tipo (traseiro, dianteiro, etc.)
   * @param {number} [params.weight]     - Peso total em kg
   * @param {number} [params.pricePerKg] - Preço de compra por kg em R$
   */
  constructor({ type = 'traseiro', weight = 0, pricePerKg = 0 } = {}) {
    this.type       = type;
    this.weight     = weight;
    this.pricePerKg = pricePerKg;
  }

  get totalCost() {
    return this.weight * this.pricePerKg;
  }
}
