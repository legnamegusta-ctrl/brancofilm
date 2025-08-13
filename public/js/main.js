// js/main.js
// js/main.js
import { navigate } from './router.js';
import { applyTranslations, initLangToggle } from './i18n.js';
import { logClientError } from './services/firestoreService.js';
import { auth } from './firebase-config.js';

function setupTelemetry() {
  window.addEventListener('error', (e) => {
    logClientError({
      uid: auth.currentUser?.uid || null,
      route: location.hash,
      message: e.message,
      stack: e.error?.stack || '',
      ua: navigator.userAgent,
      ts: new Date().toISOString(),
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    logClientError({
      uid: auth.currentUser?.uid || null,
      route: location.hash,
      message: e.reason?.message || '',
      stack: e.reason?.stack || '',
      ua: navigator.userAgent,
      ts: new Date().toISOString(),
    });
  });
}

const main = () => {
  window.addEventListener('hashchange', navigate);
  document.addEventListener('lang:changed', () => applyTranslations());
  applyTranslations();
  initLangToggle(document.getElementById('langToggle'));
  setupTelemetry();
  navigate();
};

document.addEventListener('DOMContentLoaded', main);
