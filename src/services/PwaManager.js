// src/services/PwaManager.js
// Encapsula todo o ciclo de vida PWA (install prompt, Service Worker, updates)
// atrás de um estado próprio + eventos, eliminando o estado global mutável
// (antigo window.__pwa) e mantendo Controller/View livres de lógica de plataforma.
export class PwaManager extends EventTarget {
  constructor(version) {
    super();
    this.version = version;
    this.installPrompt = null;
    this.hasUpdate = false;
    this.swRegistration = null;
    this._captureInstallPrompt();
  }

  get isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
  }

  get state() {
    return {
      version: this.version,
      installPrompt: this.installPrompt,
      hasUpdate: this.hasUpdate,
      isInstalled: this.isInstalled,
    };
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('change', { detail: this.state }));
  }

  _captureInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      console.log('%c[PWA] Instalação disponível', 'color:#c17f24');
      this._emitChange();
    });
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { type: 'module' });
      this.swRegistration = reg;
      console.log('%c[SW] Registrado', 'color:#888');

      if (reg.waiting) {
        this.hasUpdate = true;
        console.log('%c[SW] Atualização pendente', 'color:#c17f24');
        this._emitChange();
      }

      reg.addEventListener('updatefound', () => {
        console.log('%c[SW] Nova versão encontrada, baixando...', 'color:#c17f24');
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            this.hasUpdate = true;
            console.log('%c[SW] Atualização pronta ✓', 'color:#c17f24;font-weight:bold');
            this._emitChange();
          }
        });
      });
    } catch (err) {
      console.warn('[SW] Não registrado:', err);
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  async promptInstall() {
    if (!this.installPrompt) return;
    this.installPrompt.prompt();
    const { outcome } = await this.installPrompt.userChoice;
    if (outcome === 'accepted') {
      this.installPrompt = null;
      this._emitChange();
    }
  }

  applyUpdate() {
    if (this.swRegistration?.waiting) {
      // Envia sinal ao SW em espera; ele ativará e controllerchange recarregará.
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }
}
