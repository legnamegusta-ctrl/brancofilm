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
import { renderUiKitView } from './views/uiKitView.js';
import { auth } from './firebase-config.js';

window.__MVP__ = true;

const appContainer = document.getElementById('page-content');
const pageHeader = document.getElementById('page-header');
const netStatus = document.getElementById('net-status');
const sidebarLinks = document.querySelectorAll('#sidebar a[data-route]');
const tabbarLinks = document.querySelectorAll('#tabbar a[data-route]');
const tabbar = document.getElementById('tabbar');
const fabNew = document.getElementById('fab-new');
const globalSearch = document.getElementById('global-search');
const topbarTitle = document.getElementById('topbar-title');

const MVP_ROUTES = ['#login', '#dashboard', '#agenda', '#ordens', '#clientes'];
const ROUTE_TITLES = {
  '#dashboard': 'Dashboard',
  '#agenda': 'Agenda',
  '#ordens': 'Ordens',
  '#clientes': 'Clientes',
  '#login': 'Login'
};

function renderNotAvailable() {
  appContainer.innerHTML = '<p class="center">Em breve</p>';
  pageHeader.style.display = 'none';
}

window.setPageHeader = ({ title = '', breadcrumbs = [], actions = [], filters = '' }) => {
  const crumbs = breadcrumbs.length ? `<nav class="breadcrumbs">${breadcrumbs.join(' / ')}</nav>` : '';
  const acts = actions.slice(0,2).map(a => `<button class="btn ${a.variant || 'btn-primary'}" id="${a.id}">${a.label}</button>`).join('');
  pageHeader.innerHTML = `
    ${crumbs}
    <div class="header-main">
      <h1>${title}</h1>
      <div class="actions">${acts}</div>
    </div>
    <div class="filters">${filters}</div>
  `;
  pageHeader.style.display = '';
};

globalSearch?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const term = globalSearch.value.trim();
    if (term) window.dispatchEvent(new CustomEvent('global-search', { detail: term }));
  }
});

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
  '#ordens': renderOrdersView,
  '#kanban': renderKanbanView,
  '#my-work': renderMyWorkView,
  '#orcamentos': renderQuotesView,
  '#relatorios': renderReportsView,
  '#relatorios-avancados': renderReportsAdvancedView,
  '#ui-kit': renderUiKitView,
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
  pageHeader.style.display = 'none';
  pageHeader.innerHTML = '';

  if (hash.startsWith('#orders')) {
    location.hash = hash.replace('#orders', '#ordens');
    return;
  }

  if (hash === '#login') {
    tabbar?.style.setProperty('display', 'none');
    fabNew?.style.setProperty('display', 'none');
  } else {
    tabbar?.style.removeProperty('display');
    fabNew?.style.removeProperty('display');
  }

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
    pageHeader.style.display = 'none';
    topbarTitle && (topbarTitle.textContent = ROUTE_TITLES['#login']);
    return;
  }

  const [mainPath, ...rest] = hash.split('/');
  const param = rest.join('/') || null;

  if (!MVP_ROUTES.includes(mainPath)) {
    topbarTitle && (topbarTitle.textContent = 'Em breve');
    renderNotAvailable();
    return;
  }

  const adminRoutes = ['#usuarios', '#config', '#dev', '#unidades'];
  const role = window.sessionState?.role;
  if (adminRoutes.includes(mainPath) && role !== 'admin') {
    location.hash = '#dashboard';
    return;
  }

  sidebarLinks.forEach(link => link.classList.remove('active'));
  tabbarLinks.forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`#sidebar a[data-route="${mainPath}"]`);
  activeLink?.classList.add('active');
  const activeTab = document.querySelector(`#tabbar a[data-route="${mainPath}"]`);
  activeTab?.classList.add('active');

  topbarTitle && (topbarTitle.textContent = ROUTE_TITLES[mainPath] || '');

  const fn = routes[mainPath];
  if (typeof fn === 'function') {
    fn(param);
  } else {
    renderDashboardView();
  }
}
