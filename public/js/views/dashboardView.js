// js/views/dashboardView.js
import {
  countCustomers,
  countOrders,
  sumOrdersTotal,
  getNextSchedules,
  getCustomerById
} from '../services/firestoreService.js';

const customerCache = {};

export async function renderDashboardView() {
  const root = document.getElementById('page-content');
  if (!root) throw new Error('#page-content não encontrado');
  root.innerHTML = `
  <section class="mobile container">
    <header class="page-header">
      <h1>Dashboard</h1>
    </header>
    <div class="kpi-grid">
      <div class="kpi-card"><span class="kpi-title">OS Abertas</span><span class="kpi-value">--</span></div>
      <div class="kpi-card"><span class="kpi-title">Hoje</span><span class="kpi-value">--</span></div>
      <div class="kpi-card"><span class="kpi-title">Faturamento</span><span class="kpi-value">--</span></div>
      <div class="kpi-card"><span class="kpi-title">Clientes</span><span class="kpi-value">--</span></div>
    </div>
    <div id="dash-recent"></div>
  </section>`;

  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24*60*60*1000);
    const [openOrders, todayOrders, revenue, clients] = await Promise.all([
      countOrders({ status: 'novo' }),
      countOrders({ from: start, to: end }),
      sumOrdersTotal({ from: start, to: end }),
      countCustomers()
    ]);
    const kpis = root.querySelectorAll('.kpi-card .kpi-value');
    kpis[0].textContent = openOrders;
    kpis[1].textContent = todayOrders;
    kpis[2].textContent = formatBRL(revenue);
    kpis[3].textContent = clients;

    const recent = await getNextSchedules(5);
    const dashRecent = document.getElementById('dash-recent');
    if (recent.length) {
      const items = [];
      for (const o of recent) {
        if (!customerCache[o.customerId]) {
          customerCache[o.customerId] = (await getCustomerById(o.customerId))?.name || '-';
        }
        items.push(`<div><a href="#orders/${o.id}">${esc(customerCache[o.customerId])} - ${esc(o.vehicleId)} - ${formatDate(o.scheduledStart)}</a></div>`);
      }
      dashRecent.innerHTML = items.join('');
    } else {
      dashRecent.innerHTML = '<p class="muted">Nenhum agendamento</p>';
    }
  } catch (e) {
    console.error(e);
  }
}

const formatBRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = ts => {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds*1000) : new Date(ts);
  return d.toLocaleString('pt-BR');
};
const esc = s => (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
