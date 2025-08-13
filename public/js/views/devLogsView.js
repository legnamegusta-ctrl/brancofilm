import { t } from '../i18n.js';
import { getClientErrors, cleanOldClientErrors } from '../services/firestoreService.js';

export async function renderDevLogsView() {
  const container = document.getElementById('app-container');
  container.innerHTML = `<h2>${t('logs.title')}</h2><div id="logs-list" class="mt"></div><button id="btn-clean" class="btn btn-secondary mt">${t('logs.clear')}</button>`;

  const listEl = container.querySelector('#logs-list');
  const logs = await getClientErrors().catch(() => []);
  listEl.innerHTML = logs.map(l => `<div class="card"><strong>${l.route}</strong><pre>${l.message}</pre></div>`).join('');

  container.querySelector('#btn-clean').addEventListener('click', async () => {
    await cleanOldClientErrors();
    alert(t('common.saved'));
  });
}

