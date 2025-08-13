// js/views/agendaView.js
import { getOrders, addOrder, updateOrder, getCustomers, getCustomerById, getVehiclesForCustomer, getServicos } from '../services/firestoreService.js';
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const appContainer = document.getElementById('app-container');
const modalPlaceholder = document.getElementById('modal-placeholder');
let calendar;

export const renderAgendaView = async () => {
  appContainer.innerHTML = `
    <section>
      <h2>Agenda</h2>
      <div id="calendar-container" class="card" style="padding:8px"></div>
      <div class="mt"><button class="btn" id="btnNewEvent">Novo agendamento</button></div>
    </section>
  `;
  const orders = await getOrders();
  const customers = {};
  for (const o of orders) {
    if (!customers[o.customerId]) {
      customers[o.customerId] = (await getCustomerById(o.customerId))?.name || '';
    }
  }
  const events = orders.filter(o=>o.scheduledStart).map(o => ({
    id: o.id,
    title: `${customers[o.customerId] || ''} - ${o.items?.[0]?.name || ''}`,
    start: o.scheduledStart.seconds ? new Date(o.scheduledStart.seconds*1000) : o.scheduledStart,
    end: o.scheduledEnd?.seconds ? new Date(o.scheduledEnd.seconds*1000) : (o.scheduledEnd || null)
  }));
  const { Calendar } = window;
  calendar = new Calendar(document.getElementById('calendar-container'), {
    initialView: 'dayGridMonth',
    height: 'auto',
    events,
    editable: true,
    eventClick: info => { location.hash = `#orders/${info.event.id}`; },
    eventDrop: async info => {
      await updateOrder(info.event.id, {
        scheduledStart: Timestamp.fromDate(info.event.start),
        scheduledEnd: info.event.end ? Timestamp.fromDate(info.event.end) : null
      });
    },
    eventResize: async info => {
      await updateOrder(info.event.id, {
        scheduledStart: Timestamp.fromDate(info.event.start),
        scheduledEnd: info.event.end ? Timestamp.fromDate(info.event.end) : null
      });
    }
  });
  calendar.render();
  document.getElementById('btnNewEvent').onclick = () => openNewModal();
};

async function openNewModal() {
  const clients = await getCustomers();
  const servicos = await getServicos();
  modalPlaceholder.innerHTML = `
    <div class="modal"><div class="card">
      <div class="card-header">Novo agendamento</div>
      <div class="card-body">
        <form id="agenda-form" class="grid">
          <label>Cliente*
            <select id="aCustomer" required>
              <option value="">—</option>
              ${clients.map(c=>`<option value="${c.id}">${esc(c.name||'-')}</option>`).join('')}
            </select>
          </label>
          <label>Veículo*
            <select id="aVehicle" required><option value="">—</option></select>
          </label>
          <label>Serviço*
            <select id="aService" required>
              <option value="">—</option>
              ${servicos.map(s=>`<option value="${s.id}" data-name="${attr(s.name)}" data-price="${Number(s.price)||0}">${esc(s.name)}</option>`).join('')}
            </select>
          </label>
          <label>Início* <input id="aStart" type="datetime-local" required /></label>
          <label>Fim <input id="aEnd" type="datetime-local" /></label>
          <label>Notas <textarea id="aNotes"></textarea></label>
          <div class="card-actions">
            <button class="btn">Criar</button>
            <button type="button" class="link" id="aCancel">Cancelar</button>
          </div>
        </form>
      </div>
    </div></div>
  `;
  document.getElementById('aCustomer').onchange = async e => {
    const vs = await getVehiclesForCustomer(e.target.value);
    document.getElementById('aVehicle').innerHTML =
      '<option value="">—</option>' + vs.map(v=>`<option value="${v.id}">${esc(v.model||v.plate||'-')}</option>`).join('');
  };
  document.getElementById('aCancel').onclick = closeModal;
  document.getElementById('agenda-form').onsubmit = async e => {
    e.preventDefault();
    const serviceSelect = document.getElementById('aService');
    const opt = serviceSelect.selectedOptions[0];
    const item = { servicoId: serviceSelect.value, name: opt.dataset.name, price: Number(opt.dataset.price) };
    const data = {
      customerId: document.getElementById('aCustomer').value,
      vehicleId: document.getElementById('aVehicle').value,
      items: [item],
      discount: 0,
      total: item.price,
      status: 'novo',
      notes: document.getElementById('aNotes').value.trim(),
      scheduledStart: Timestamp.fromDate(new Date(document.getElementById('aStart').value)),
      scheduledEnd: document.getElementById('aEnd').value ? Timestamp.fromDate(new Date(document.getElementById('aEnd').value)) : null
    };
    const id = await addOrder(data);
    closeModal();
    renderAgendaView();
    location.hash = `#orders/${id}`;
  };
}

function closeModal(){ modalPlaceholder.innerHTML=''; }

const esc  = (s='') => s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr = (s='') => esc(s).replace(/"/g,'&quot;');

