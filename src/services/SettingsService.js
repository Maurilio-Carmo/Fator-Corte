// src/services/SettingsService.js
// Persistência das configurações do usuário (localStorage).
const STORAGE_KEY = 'fc_settings';

const DEFAULTS = { priceMode: 'margin', costMode: 'scarcity', inputMode: 'price' };

export const SettingsService = {
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === 'object') {
        return {
          priceMode: saved.priceMode === 'markup'  ? 'markup'  : 'margin',
          costMode:  saved.costMode  === 'equal'   ? 'equal'   : 'scarcity',
          inputMode: saved.inputMode === 'per_cut' ? 'per_cut' : 'price',
        };
      }
    } catch { /* ignora erros de parse */ }
    return { ...DEFAULTS };
  },

  save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignora erros de quota */ }
  },
};
