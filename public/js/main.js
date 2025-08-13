// js/main.js
import { navigate } from './router.js';

const main = () => {
  window.addEventListener('hashchange', navigate);
  navigate();
};

document.addEventListener('DOMContentLoaded', main);
