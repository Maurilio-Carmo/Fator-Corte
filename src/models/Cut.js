/**
 * Cut.js — Model representing a single beef cut derived from a carcass.
 */
export class Cut {
  /**
   * @param {Object} params
   * @param {string} [params.id]        - Unique identifier (auto-generated if omitted)
   * @param {string} [params.name]      - Display name of the cut
   * @param {number} [params.weight]    - Weight of this cut in kg
   * @param {number} [params.salePrice] - Sale price per kg in R$
   */
  constructor({ id, name = '', weight = 0, salePrice = 0 } = {}) {
    this.id = id ?? (
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    );
    this.name = name;
    this.weight = weight;
    this.salePrice = salePrice;
  }

  /**
   * Returns true if this cut has enough data to participate in calculations.
   * @returns {boolean}
   */
  get isValid() {
    return this.weight > 0;
  }

  /**
   * Returns a plain object representation.
   * @returns {{ id: string, name: string, weight: number, salePrice: number }}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      weight: this.weight,
      salePrice: this.salePrice,
    };
  }
}
