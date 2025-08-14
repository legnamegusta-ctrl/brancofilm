// js/views/kanbanView.js
import { getOrdersByStatus, updateOrdersKanban, setOrderAssignedTo, countOrderPhotos, getCustomerById, getVehicleById } from '../services/firestoreService.js';
import { auth } from '../firebase-config.js';

const appContainer = document.getElementById('page-content');

export async function renderKanbanView() {
  window.setPageHeader({ title: 'Kanban', breadcrumbs: ['Operação', 'Kanban'] });
  appContainer.innerHTML = `
    <section class="card container-lg">
      <div id="kanban-board" class="kanban-board"></div>
    </section>
  `;
  const statuses = ['novo','em_andamento','concluido','cancelado'];
  const board = document.getElementById('kanban-board');
  const customerCache = {}, vehicleCache = {};
  const wip = { em_andamento:5 };
  for (const st of statuses) {
    const col = document.createElement('div');
    col.className = 'kanban-col';
    col.dataset.status = st;
    col.innerHTML = `<div class="kanban-col-header">${st} (<span id="cnt-${st}">0</span>${wip[st]?`/${wip[st]}`:''})</div><div class="kanban-items" id="col-${st}"></div>`;
    board.appendChild(col);
    const orders = await getOrdersByStatus(st);
    const listEl = col.querySelector('.kanban-items');
    let html = '';
    for (const o of orders) {
      if (!customerCache[o.customerId]) customerCache[o.customerId] = (await getCustomerById(o.customerId))?.name || '';
      if (o.vehicleId && !vehicleCache[o.vehicleId]) vehicleCache[o.vehicleId] = (await getVehicleById(o.vehicleId))?.plate || '';
      const photos = await countOrderPhotos(o.id);
      html += `<div class="kanban-card" draggable="true" data-id="${o.id}">
        <div>${esc(customerCache[o.customerId]||'')}</div>
        <div class="text-sm">${esc(vehicleCache[o.vehicleId]||'')}</div>
        <div class="text-sm">${formatDate(o.scheduledStart)}</div>
        <div class="text-sm">R$ ${(Number(o.total)||0).toFixed(2)} ${photos?'<span class="muted">📎</span>':''}</div>
      </div>`;
    }
    listEl.innerHTML = html;
    document.getElementById(`cnt-${st}`).textContent = orders.length;
  }
  // simples drag and drop
  let dragId = null;
  board.addEventListener('dragstart', e=>{
    const card = e.target.closest('.kanban-card');
    if(card){ dragId = card.dataset.id; card.classList.add('dragging'); }
  });
  board.addEventListener('dragend', e=>{
    e.target.closest('.kanban-card')?.classList.remove('dragging');
  });
  board.addEventListener('dragover', e=>{
    if(e.target.classList.contains('kanban-items')) e.preventDefault();
  });
  board.addEventListener('drop', async e=>{
    const list = e.target.closest('.kanban-items');
    if(list && dragId){
      const status = list.parentElement.dataset.status;
      const card = document.querySelector(`[data-id="${dragId}"]`);
      const prevStatus = card.parentElement.parentElement.dataset.status;
      list.appendChild(card);
      const cards = Array.from(list.children);
      const updates = cards.map((c,i)=>({id:c.dataset.id,status,kanbanOrder:i}));
      await updateOrdersKanban(updates);
      document.getElementById(`cnt-${status}`).textContent = cards.length;
      document.getElementById(`cnt-${prevStatus}`).textContent = document.querySelectorAll(`#col-${prevStatus} .kanban-card`).length;
      dragId=null;
    }
  });
}

const esc  = (s='') => s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const formatDate = ts => ts?.seconds ? new Date(ts.seconds*1000).toLocaleDateString() : '';
