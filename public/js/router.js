import { renderClientesView } from './views/clientesView.js';
import { renderServicosView } from './views/servicosView.js';
import { renderAgendaView } from './views/agendaView.js';
import { renderOrdersView } from './views/ordersView.js';
import { renderDashboardView } from './views/dashboardView.js';
import { renderReportsView } from './views/reportsView.js';
import { renderSettingsView } from './views/settingsView.js';
import { renderUsersView } from './views/usersView.js';
import { renderKanbanView } from './views/kanbanView.js';
import { renderMyWorkView } from './views/myWorkView.js';
import { renderQuotesView } from './views/quotesView.js';
import { renderQuotePublicView } from './views/quotePublicView.js';
import { renderReportsAdvancedView } from './views/reportsAdvancedView.js';
import { renderGoalsView } from './views/goalsView.js';
import { renderUnitsView } from './views/unitsView.js';
import { renderDevLogsView } from './views/devLogsView.js';
import { auth } from './firebase-config.js';

const appContainer = document.getElementById('app-container');
const netStatus = document.getElementById('net-status');

function updateNetStatus() {
  if (!netStatus) return;
  netStatus.hidden = navigator.onLine;
}

window.addEventListener('online', updateNetStatus);
window.addEventListener('offline', updateNetStatus);
updateNetStatus();

window.addEventListener('orders:changed', () => {
  if (location.hash.startsWith('#agenda')) renderAgendaView();
});

const routes = {
  '#dashboard': renderDashboardView,
  '#agenda': renderAgendaView,
  '#clientes': renderClientesView,
  '#servicos': renderServicosView,
  '#orders': renderOrdersView,
  '#kanban': renderKanbanView,
  '#my-work': renderMyWorkView,
  '#orcamentos': renderQuotesView,
  '#relatorios': renderReportsView,
  '#relatorios-avancados': renderReportsAdvancedView,
  '#config': (param) => {
    if (param === 'goals') return renderGoalsView();
    return renderSettingsView();
  },
  '#usuarios': renderUsersView,
  '#unidades': renderUnitsView,
  '#dev': (param) => {
    if (param === 'logs') renderDevLogsView();
  },
  '#q': renderQuotePublicView,
};

export function navigate() {
  const hash = location.hash || '#dashboard';

  if (!auth.currentUser && hash !== '#login' && !hash.startsWith('#q/')) {
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

  const adminRoutes = ['#usuarios', '#config', '#dev', '#unidades'];
  const role = window.sessionState?.role;
  if (adminRoutes.includes(mainPath) && role !== 'admin') {
    location.hash = '#dashboard';
    return;
  }

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
