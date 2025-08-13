import { t } from '../i18n.js';

export function renderReportsAdvancedView() {
  const container = document.getElementById('app-container');
  container.innerHTML = `
    <h2>${t('reports.advanced.title')}</h2>
    <div class="tabs">
      <button class="tab-btn" data-tab="revenue">${t('reports.tabs.revenue')}</button>
      <button class="tab-btn" data-tab="customers">${t('reports.tabs.customers')}</button>
      <button class="tab-btn" data-tab="conversion">${t('reports.tabs.conversion')}</button>
      <button class="tab-btn" data-tab="productivity">${t('reports.tabs.productivity')}</button>
      <button class="tab-btn" data-tab="heatmap">${t('reports.tabs.heatmap')}</button>
    </div>
    <div id="reports-advanced-content" class="mt"></div>
  `;

  const content = container.querySelector('#reports-advanced-content');
  function show(tab) {
    content.innerHTML = `<p>${t('reports.tabs.' + tab)} - TODO</p>`;
  }
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => show(btn.dataset.tab));
  });
  show('revenue');
}

