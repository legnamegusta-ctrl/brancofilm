// js/views/myWorkView.js
import { getOrdersAssignedTo, updateOrder } from '../services/firestoreService.js';
import { auth } from '../firebase-config.js';

const appContainer = document.getElementById('app-container');

export async function renderMyWorkView() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  appContainer.innerHTML = '<section class="card"><h2>Minha Tarefa</h2><div id="my-orders"></div></section>';
  const orders = await getOrdersAssignedTo(uid);
  const container = document.getElementById('my-orders');
  container.innerHTML = orders.map(o=>`<div class="kanban-card" data-id="${o.id}"><strong>${o.customerId}</strong> - ${o.status} <button data-adv="${o.id}">Avançar</button></div>`).join('') || '<p class="muted">Nenhuma OS atribuída</p>';
  container.onclick = async e => {
    const adv = e.target.closest('[data-adv]');
    if (adv) {
      const id = adv.dataset.adv;
      const order = orders.find(o=>o.id===id);
      const next = { novo:'em_andamento', em_andamento:'concluido', concluido:'concluido', cancelado:'cancelado' }[order.status];
      await updateOrder(id,{ status: next });
      renderMyWorkView();
    }
  };
}
