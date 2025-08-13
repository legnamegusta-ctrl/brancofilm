import { exportCollections, importCollections } from '../services/firestoreService.js';
import { t } from '../i18n.js';

export function renderSettingsView() {
  const container = document.getElementById('app-container');
  container.innerHTML = `
    <h2>Configurações</h2>
    <nav class="tabs mt">
      <a href="#config" class="tab-btn" aria-selected="true">${t('settings.general')}</a>
      <a href="#config/goals" class="tab-btn">${t('navbar.goals')}</a>
    </nav>
    <section class="mt">
      <h3>Backup</h3>
      <button id="btn-backup" class="btn btn-primary">Exportar JSON</button>
      <input type="file" id="backup-file" accept="application/json" class="mt" />
      <button id="btn-restore" class="btn btn-secondary mt">Importar JSON</button>
    </section>
  `;

  document.getElementById('btn-backup').addEventListener('click', async () => {
    const json = await exportCollections(['customers','vehicles','services','orders']);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('btn-restore').addEventListener('click', async () => {
    const file = document.getElementById('backup-file').files[0];
    if (!file) return;
    const text = await file.text();
    await importCollections(text, { mode: 'merge', collections: ['customers','vehicles','services','orders'] });
    alert('Importação concluída');
  });
}
