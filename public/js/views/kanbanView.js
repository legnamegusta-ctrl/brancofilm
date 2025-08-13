// js/views/kanbanView.js
import { getOrdersByStatus, updateOrdersKanban, setOrderAssignedTo, countOrderPhotos } from '../services/firestoreService.js';
import { auth } from '../firebase-config.js';

const appContainer = document.getElementById('page-content');

export async function renderKanbanView() {
  appContainer.innerHTML = `
    <section class="card">
      <h2>Kanban</h2>
      <div id="kanban-board" class="kanban-board"></div>
    </section>
  `;
  const statuses = ['novo','em_andamento','concluido','cancelado'];
  const board = document.getElementById('kanban-board');
  for (const st of statuses) {
    const col = document.createElement('div');
    col.className = 'kanban-col';
    col.dataset.status = st;
    col.innerHTML = `<h3>${st}</h3><div class="kanban-items" id="col-${st}"></div>`;
    board.appendChild(col);
    const orders = await getOrdersByStatus(st);
    const listEl = col.querySelector('.kanban-items');
    listEl.innerHTML = orders.map(o=>`<div class="kanban-card" draggable="true" data-id="${o.id}">${o.id}</div>`).join('');
  }
  // simples drag and drop
  let dragId = null;
  board.addEventListener('dragstart', e=>{
    const card = e.target.closest('.kanban-card');
    if(card){ dragId = card.dataset.id; }
  });
  board.addEventListener('dragover', e=>{
    if(e.target.classList.contains('kanban-items')) e.preventDefault();
  });
  board.addEventListener('drop', async e=>{
    const list = e.target.closest('.kanban-items');
    if(list && dragId){
      const status = list.parentElement.dataset.status;
      const cards = Array.from(list.children);
      list.appendChild(document.querySelector(`[data-id="${dragId}"]`));
      const updates = cards.concat(document.querySelector(`[data-id="${dragId}"]`)).map((c,i)=>({id:c.dataset.id,status,kanbanOrder:i}));
      await updateOrdersKanban(updates);
      dragId=null;
    }
  });
}
