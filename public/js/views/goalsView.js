import { t } from '../i18n.js';
import { getGoals, setGoals } from '../services/firestoreService.js';

export async function renderGoalsView() {
  const container = document.getElementById('app-container');
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7); // YYYY-MM
  const goals = await getGoals(monthKey).catch(() => ({}));

  container.innerHTML = `
    <h2>${t('goals.title')}</h2>
    <form id="goals-form" class="grid">
      <label>${t('goals.revenueTarget')}<input id="goal-revenue" type="number" class="input" value="${goals.revenueTarget || ''}" /></label>
      <label>${t('goals.ordersTarget')}<input id="goal-orders" type="number" class="input" value="${goals.ordersTarget || ''}" /></label>
      <button type="submit" class="btn btn-primary mt">${t('goals.save')}</button>
    </form>
  `;

  const form = container.querySelector('#goals-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      revenueTarget: Number(container.querySelector('#goal-revenue').value) || 0,
      ordersTarget: Number(container.querySelector('#goal-orders').value) || 0,
    };
    await setGoals(monthKey, data);
    alert(t('common.saved'));
  });
}

