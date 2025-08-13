// js/views/dashboardView.js
import {
  countCustomers,
  countVehicles,
  countServices,
  countOrders,
  sumOrdersTotal,
  getNextSchedules,
  getCustomerById
} from '../services/firestoreService.js';

const appContainer = document.getElementById('page-content');
const customerCache = {};
window.addEventListener('orders-changed', ()=>{ if(document.getElementById('next-list')) loadNext(); });

export async function renderDashboardView() {
  window.setPageHeader({ title: 'Dashboard', breadcrumbs: ['Operação', 'Dashboard'] });
  appContainer.innerHTML = `<section class="card" aria-busy="true"><div class="skeleton" style="height:2rem"></div></section>`;
  try {
    const now = new Date();
    const from30 = new Date(now.getTime() - 30*24*60*60*1000);
    const [cust, veh, serv, ord] = await Promise.all([
      countCustomers(), countVehicles(), countServices(), countOrders()
    ]);
    const statusKeys = ['novo','em_andamento','concluido','cancelado'];
    const statusCounts = await Promise.all(statusKeys.map(st => countOrders({status: st, from: from30, to: now})));
    appContainer.innerHTML = `
      <section class="card">
        <div class="grid-4 mt" id="dash-counts">
          <div class="tile">Clientes<br><strong>${cust}</strong></div>
          <div class="tile">Veículos<br><strong>${veh}</strong></div>
          <div class="tile">Serviços<br><strong>${serv}</strong></div>
          <div class="tile">Ordens<br><strong>${ord}</strong></div>
        </div>
        <div class="mt">
          <h3>Ordens nos últimos 30 dias</h3>
          <div class="chips">
            ${statusKeys.map((st,i)=>`<span class="badge">${st}: ${statusCounts[i]}</span>`).join(' ')}
          </div>
        </div>
        <div class="mt">
          <h3>Faturamento estimado</h3>
          <select id="fat-period">
            <option value="7">7 dias</option>
            <option value="30" selected>30 dias</option>
            <option value="90">90 dias</option>
          </select>
          <span id="fat-value" class="ml">-</span>
        </div>
        <div class="mt">
          <h3>Próximos agendamentos</h3>
          <ul id="next-list" class="mt"></ul>
        </div>
      </section>`;
    document.getElementById('fat-period').onchange = updateFat;
    await updateFat();
    await loadNext();
  } catch (e) {
    appContainer.innerHTML = `<section class="card"><p class="alert">Erro ao carregar.</p></section>`;
  }
}

async function updateFat() {
  const sel = document.getElementById('fat-period');
  const days = Number(sel.value);
  const now = new Date();
  const from = new Date(now.getTime() - days*24*60*60*1000);
  const val = await sumOrdersTotal({ from, to: now });
  document.getElementById('fat-value').textContent = formatBRL(val);
}

async function loadNext() {
  const list = document.getElementById('next-list');
  const orders = await getNextSchedules(5);
  if (!orders.length) { list.innerHTML = '<li class="muted">Nenhum agendamento</li>'; return; }
  const items = [];
  for (const o of orders) {
    if (!customerCache[o.customerId]) {
      customerCache[o.customerId] = (await getCustomerById(o.customerId))?.name || '-';
    }
    items.push(`<li><a href="#orders/${o.id}">${esc(customerCache[o.customerId])} - ${esc(o.vehicleId)} - ${formatDate(o.scheduledStart)}</a></li>`);
  }
  list.innerHTML = items.join('');
}

const formatBRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = ts => {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds*1000) : new Date(ts);
  return d.toLocaleString('pt-BR');
};
const esc = s => (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
