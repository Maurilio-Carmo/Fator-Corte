// src/models/Cut.js
// Modelo de um corte de carne derivado de uma carcaça.
export class Cut {
  /**
   * @param {Object}  [params]
   * @param {string}  [params.id]           - Identificador único (gerado automaticamente se omitido)
   * @param {string}  [params.name]         - Nome do corte
   * @param {number}  [params.weight]       - Peso em kg
   * @param {number}  [params.salePrice]    - Preço de venda por kg em R$
   * @param {boolean} [params.isSubproduct] - Retalho/subproduto: sem penalidade de escassez
   */
  constructor({ id, name = '', weight = 0, salePrice = 0, isSubproduct = false } = {}) {
    this.id = id ?? (
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    );
    this.name        = name;
    this.weight      = weight;
    this.salePrice   = salePrice;
    this.isSubproduct = isSubproduct;
  }
}
