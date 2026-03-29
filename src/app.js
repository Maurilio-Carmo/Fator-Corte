/**
 * app.js — Entry point. Bootstraps the MVC application when the DOM is ready.
 */
import { AppController } from './controllers/AppController.js';

/**
 * Bootstrap function — instantiates the controller and starts the app.
 */
function bootstrap() {
  const controller = new AppController();
  controller.init();
}

// Wait for DOM to be fully parsed before bootstrapping
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
