import { t } from '../i18n.js';
import { getUnits, setDefaultUnitForAll } from '../services/firestoreService.js';

export async function renderUnitsView() {
  const container = document.getElementById('app-container');
  container.innerHTML = `<h2>${t('units.title')}</h2><div id="units-list" class="mt"></div>`;

  const listEl = container.querySelector('#units-list');
  const units = await getUnits().catch(() => []);
  listEl.innerHTML = units.map(u => `<div class="card">${u.name}</div>`).join('');

  // Placeholder for migration button
  const btnMig = document.createElement('button');
  btnMig.textContent = t('units.migration');
  btnMig.className = 'btn btn-secondary mt';
  btnMig.addEventListener('click', async () => {
    const unitId = units[0]?.id;
    if (!unitId) return;
    await setDefaultUnitForAll(['customers', 'vehicles', 'services', 'orders'], unitId);
    alert(t('common.saved'));
  });
  container.appendChild(btnMig);
}

