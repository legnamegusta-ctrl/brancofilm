import { renderClientesView } from './views/clientesView.js';
import { renderServicosView } from './views/servicosView.js';
import { renderAgendaView } from './views/agendaView.js';
import { renderOrdersView } from './views/ordersView.js';
import { renderDashboardView } from './views/dashboardView.js';
import { auth } from './firebase-config.js';

const appContainer = document.getElementById('app-container');

const routes = {
  '#dashboard': renderDashboardView,
  '#agenda': renderAgendaView,
  '#clientes': renderClientesView,
  '#servicos': renderServicosView,
  '#orders': renderOrdersView,
};

export function navigate() {
  const hash = location.hash || '#dashboard';

  if (!auth.currentUser && hash !== '#login') {
    location.hash = '#login';
    return;
  }

  if (auth.currentUser && hash === '#login') {
    location.hash = '#dashboard';
    return;
  }

  if (hash === '#login') {
    appContainer.innerHTML = '';
    return;
  }

  const [mainPath, ...rest] = hash.split('/');
  const param = rest.join('/') || null;

  const navLinks = document.querySelectorAll('#main-nav a');
  navLinks.forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`#main-nav a[href^="${mainPath}"]`);
  if (activeLink) activeLink.classList.add('active');

  const fn = routes[mainPath];
  if (typeof fn === 'function') {
    fn(param);
  } else {
    renderDashboardView();
  }
}
