// js/views/ordersView.js
import {
  getOrders, getOrderById, addOrder, updateOrder, deleteOrder,
  getCustomers, getCustomerById,
  getVehiclesForCustomer, getServicos
} from '../services/firestoreService.js';
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const appContainer = document.getElementById('app-container');

export const renderOrdersView = async (param) => {
  if (param && param !== 'new') {
    return renderOrderDetail(param);
  }
  if (param === 'new') {
    return renderOrderDetail(null);
  }
  return renderOrdersList();
};

async function renderOrdersList() {
  const orders = await getOrders();
  const customerCache = {};
  for (const o of orders) {
    if (!customerCache[o.customerId]) {
      customerCache[o.customerId] = (await getCustomerById(o.customerId))?.name || '-';
    }
    o.customerName = customerCache[o.customerId];
  }
  appContainer.innerHTML = `
    <section class="card">
      <h2>Ordens de Serviço</h2>
      <div class="grid mt">
        <select id="filter-status">
          <option value="">Todos</option>
          <option value="novo">Novo</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <input type="date" id="filter-from" />
        <input type="date" id="filter-to" />
        <button class="btn" id="applyFilters">Filtrar</button>
        <button class="btn" id="btnNewOrder">Nova OS</button>
      </div>
      <table class="mt simple-table">
        <thead><tr><th>Cliente</th><th>Status</th><th>Total</th><th>Agendado</th><th>Criado</th><th></th></tr></thead>
        <tbody id="orders-body"></tbody>
      </table>
    </section>
  `;
  document.getElementById('btnNewOrder').onclick = () => location.hash = '#orders/new';
  document.getElementById('applyFilters').onclick = () => applyFilters();
  renderOrdersTable(orders);

  async function applyFilters() {
    const status = document.getElementById('filter-status').value || null;
    const fromVal = document.getElementById('filter-from').value;
    const toVal   = document.getElementById('filter-to').value;
    const from = fromVal ? Timestamp.fromDate(new Date(fromVal)) : null;
    const to   = toVal   ? Timestamp.fromDate(new Date(toVal))   : null;
    const list = await getOrders({ status, from, to });
    for (const o of list) {
      if (!customerCache[o.customerId]) {
        customerCache[o.customerId] = (await getCustomerById(o.customerId))?.name || '-';
      }
      o.customerName = customerCache[o.customerId];
    }
    renderOrdersTable(list);
  }
}

function renderOrdersTable(list) {
  const body = document.getElementById('orders-body');
  body.innerHTML = list.map(o => `
    <tr>
      <td>${esc(o.customerName || o.customerId)}</td>
      <td><span class="badge ${o.status}">${o.status}</span></td>
      <td>R$ ${(Number(o.total)||0).toFixed(2)}</td>
      <td>${formatDate(o.scheduledStart)}</td>
      <td>${formatDate(o.createdAt)}</td>
      <td>
        <button class="link" data-open="${o.id}">Abrir</button>
        <button class="link" data-del="${o.id}">Excluir</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="muted">Nenhuma OS</td></tr>';
  body.onclick = async e => {
    const open = e.target.closest('[data-open]');
    const del = e.target.closest('[data-del]');
    if (open) {
      location.hash = `#orders/${open.dataset.open}`;
    } else if (del) {
      if (confirm('Excluir OS?')) {
        await deleteOrder(del.dataset.del);
        renderOrdersList();
      }
    }
  };
}

async function renderOrderDetail(orderId) {
  const isNew = !orderId;
  const order = orderId ? await getOrderById(orderId) : null;
  const clients = await getCustomers();
  const servicos = await getServicos();
  let vehicles = [];
  if (order?.customerId) {
    vehicles = await getVehiclesForCustomer(order.customerId);
  }

  const itemsSet = new Set(order?.items?.map(i => i.servicoId));
  appContainer.innerHTML = `
    <section class="card print-card">
      <h2>${isNew ? 'Nova' : 'Editar'} Ordem de Serviço</h2>
      <form id="order-form" class="grid" aria-busy="false">
        <label>Cliente*
          <select id="oCustomer" required>
            <option value="">—</option>
            ${clients.map(c=>`<option value="${c.id}" ${order?.customerId===c.id?'selected':''}>${esc(c.name||'-')}</option>`).join('')}
          </select>
        </label>
        <label>Veículo*
          <select id="oVehicle" required>
            <option value="">—</option>
            ${vehicles.map(v=>`<option value="${v.id}" ${order?.vehicleId===v.id?'selected':''}>${esc(v.model||v.plate||'-')}</option>`).join('')}
          </select>
        </label>
        <fieldset class="grid" id="oServices">
          <legend>Serviços*</legend>
          ${servicos.map(s=>`
            <label class="checkbox"><input type="checkbox" value="${s.id}" data-name="${attr(s.name)}" data-price="${Number(s.price)||0}" ${itemsSet.has(s.id)?'checked':''}/> ${esc(s.name)} (R$ ${(Number(s.price)||0).toFixed(2)})</label>
          `).join('')}
        </fieldset>
        <label>Desconto <input id="oDiscount" type="number" min="0" step="0.01" value="${order?.discount||0}" /></label>
        <div>Total: <span id="oTotal">R$ ${(Number(order?.total)||0).toFixed(2)}</span></div>
        <label>Status
          <select id="oStatus">
            ${['novo','em_andamento','concluido','cancelado'].map(st=>`<option value="${st}" ${order?.status===st?'selected':''}>${st}</option>`).join('')}
          </select>
        </label>
        <label>Notas <textarea id="oNotes">${esc(order?.notes||'')}</textarea></label>
        <label>Início <input id="oStart" type="datetime-local" value="${toLocal(order?.scheduledStart)||''}" /></label>
        <label>Fim <input id="oEnd" type="datetime-local" value="${toLocal(order?.scheduledEnd)||''}" /></label>
        <div class="card-actions">
          <button class="btn">${isNew?'Criar':'Salvar'}</button>
          ${!isNew?'<button type="button" id="oDelete" class="link">Excluir</button>':''}
          <button type="button" id="oBack" class="link">Voltar</button>
          ${!isNew?'<button type="button" id="oPrint" class="link no-print">Imprimir</button>':''}
          ${!isNew?'<button type="button" id="oCSV" class="link">CSV</button>':''}
        </div>
      </form>
    </section>
  `;

  document.getElementById('oCustomer').onchange = async e => {
    const cid = e.target.value;
    const vs = cid ? await getVehiclesForCustomer(cid) : [];
    document.getElementById('oVehicle').innerHTML =
      '<option value="">—</option>' + vs.map(v=>`<option value="${v.id}">${esc(v.model||v.plate||'-')}</option>`).join('');
  };

  document.getElementById('oServices').addEventListener('change', calcTotal);
  document.getElementById('oDiscount').addEventListener('input', calcTotal);
  calcTotal();

  document.getElementById('oBack').onclick = () => { location.hash = '#orders'; };
  if (!isNew) {
    document.getElementById('oDelete').onclick = async () => {
      if (confirm('Excluir OS?')) { await deleteOrder(orderId); location.hash = '#orders'; }
    };
    document.getElementById('oPrint').onclick = () => window.print();
    document.getElementById('oCSV').onclick = () => exportCSV(orderId, order);
  }

  document.getElementById('order-form').onsubmit = async ev => {
    ev.preventDefault();
    const form = ev.currentTarget;
    form.setAttribute('aria-busy','true');
    const customerId = document.getElementById('oCustomer').value;
    const vehicleId = document.getElementById('oVehicle').value;
    const discount = Number(document.getElementById('oDiscount').value)||0;
    const status = document.getElementById('oStatus').value;
    const notes = document.getElementById('oNotes').value.trim();
    const startVal = document.getElementById('oStart').value;
    const endVal   = document.getElementById('oEnd').value;
    const items = Array.from(document.querySelectorAll('#oServices input:checked')).map(inp => ({
      servicoId: inp.value,
      name: inp.dataset.name,
      price: Number(inp.dataset.price)
    }));
    const subtotal = items.reduce((s,i)=>s+i.price,0);
    const total = Math.max(0, subtotal - discount);
    if(!customerId || !vehicleId || items.length===0){ form.removeAttribute('aria-busy'); return; }
    const data = {
      customerId,
      vehicleId,
      items,
      discount,
      total,
      status,
      notes,
      scheduledStart: startVal ? Timestamp.fromDate(new Date(startVal)) : null,
      scheduledEnd: endVal ? Timestamp.fromDate(new Date(endVal)) : null
    };
    let newId = orderId;
    if (isNew) newId = await addOrder(data); else await updateOrder(orderId, data);
    form.removeAttribute('aria-busy');
    location.hash = `#orders/${newId}`;
  };
}

function calcTotal() {
  const items = Array.from(document.querySelectorAll('#oServices input:checked')).map(i => Number(i.dataset.price));
  const discount = Number(document.getElementById('oDiscount').value)||0;
  const subtotal = items.reduce((s,v)=>s+v,0);
  const total = Math.max(0, subtotal - discount);
  document.getElementById('oTotal').textContent = 'R$ ' + total.toFixed(2);
}

function exportCSV(id, order) {
  const lines = order.items.map(i=>`${i.name},${(Number(i.price)||0).toFixed(2)}`);
  lines.push(`Desconto,${(Number(order.discount)||0).toFixed(2)}`);
  lines.push(`Total,${(Number(order.total)||0).toFixed(2)}`);
  const blob = new Blob([lines.join('\n')], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `os-${id}.csv`;
  a.click();
}

function toLocal(ts){ if(!ts) return ''; const d=ts.seconds? new Date(ts.seconds*1000):new Date(ts); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function formatDate(ts){ if(!ts) return ''; const d=ts.seconds? new Date(ts.seconds*1000):new Date(ts); return d.toLocaleDateString(); }
const esc  = (s='') => s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr = (s='') => esc(s).replace(/"/g,'&quot;');

